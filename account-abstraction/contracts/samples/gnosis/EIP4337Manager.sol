//SPDX-License-Identifier: GPL
pragma solidity ^0.8.7;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-inline-assembly */
/* solhint-disable reason-string */

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../../safe-contracts/contracts/Safe.sol";
import "../../safe-contracts/contracts/base/Executor.sol";
import "../../safe-contracts/contracts/examples/libraries/Migrate_1_3_0_to_1_2_0.sol";
import "./EIP4337Fallback.sol";
import "../../interfaces/IAccount.sol";
import "../../interfaces/IEntryPoint.sol";
import "../../utils/Exec.sol";
import "hardhat/console.sol";
import "./Verifiers.sol";
    using ECDSA for bytes32;

/**
 * Main EIP4337 module.
 * Called (through the fallback module) using "delegate" from the GnosisSafe as an "IAccount",
 * so must implement validateUserOp
 * holds an immutable reference to the EntryPoint
 * Inherits GnosisSafe so that it can reference the memory storage
 */
contract EIP4337Manager is IAccount, SafeStorage, Executor {

    address public immutable eip4337Fallback;
    address public immutable entryPoint;
    IVerifier public immutable ecdsaVerifier;
    IVerifier public immutable blsVerifier;

    mapping(IVerifier=>uint8) public indexFromVerifier; //TODO Fallback to Safe modules
    mapping(uint8=>IVerifier) public verifierFromIndex;

    // return value in case of signature failure, with no time-range.
    // equivalent to _packValidationData(true,0,0);
    uint256 constant internal SIG_VALIDATION_FAILED = 1;

    address internal constant SENTINEL_MODULES = address(0x1);

    constructor(address anEntryPoint) {
        entryPoint = anEntryPoint;
        eip4337Fallback = address(new EIP4337Fallback(address(this)));


        ecdsaVerifier = new ECDSAVerifier();
        enableVerifier(ecdsaVerifier, 1);

        blsVerifier = new BLSGroupVerifier();
        enableVerifier(blsVerifier, 2);
    }

    function enableVerifier(IVerifier verifier, uint8 i) public {
        // console.log("enableVerifier", address(verifier), i);
        // require(indexFromVerifier[verifier] == 0, "V: Already enabled.");
        indexFromVerifier[verifier] = i;
        verifierFromIndex[i] = verifier;
    }
    function disableVerifier(IVerifier verifier, uint8 i) public {
        // require(indexFromVerifier[verifier] > 0, "V: Not enabled.");
        indexFromVerifier[verifier] = 0;
        verifierFromIndex[i] = IVerifier(address(0));
    }

    /**
     * delegate-called (using execFromModule) through the fallback, so "real" msg.sender is attached as last 20 bytes
     */
    function validateUserOp(UserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds)
    external override returns (uint256 validationData) {
        address msgSender = address(bytes20(msg.data[msg.data.length - 20 :]));
        require(msgSender == entryPoint, "account: not from entrypoint");

        validationData = verifyHash(
            userOpHash,
            userOp.signature
        );

        // mimic normal Safe nonce behaviour: prevent parallel nonces
        require(userOp.nonce < type(uint64).max, "account: nonsequential nonce");

        if (missingAccountFunds > 0) {
            //Note: MAY pay more than the minimum, to deposit for future transactions
            (bool success,) = payable(msgSender).call{value : missingAccountFunds}("");
            (success);
            //ignore failure (its EntryPoint's job to verify, not account.)
        }
    }


    function verifyHash(
        bytes32 userOpHash,
        bytes calldata verificationData
    ) internal view returns (uint256 result) {
        uint8 verifierIndex = uint8(verificationData[0]);
        IVerifier verifier;
        verifier = ecdsaVerifier;
        if (verifierIndex == 1) {
            verifier = ecdsaVerifier;
        }
        else if (verifierIndex == 2) {
            verifier = blsVerifier;
        }
        else {
            result = SIG_VALIDATION_FAILED;
            return result;
        }

        // verifier = verifierFromIndex[verifierIndex]; // TODO address from bytes
        console.log(address(verifier));

        // require(address(verifier) != address(0), "V: Unrecognised verifier");

        if (!verifier.verify(
            Safe(payable(address(this))),
            userOpHash,
            verificationData[1:]
        )) {
            result = SIG_VALIDATION_FAILED;
        }

        if (verifierIndex == 1) {
            require(threshold == 1, "account: only threshold 1");
        }
    }
    /**
     * Execute a call but also revert if the execution fails.
     * The default behavior of the Safe is to not revert if the call fails,
     * which is challenging for integrating with ERC4337 because then the
     * EntryPoint wouldn't know to emit the UserOperationRevertReason event,
     * which the frontend/client uses to capture the reason for the failure.
     */
    function executeAndRevert(
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation
    ) external {
        address msgSender = address(bytes20(msg.data[msg.data.length - 20 :]));
        require(msgSender == entryPoint, "account: not from entrypoint");
        require(msg.sender == eip4337Fallback, "account: not from EIP4337Fallback");

        bool success = execute(
            to,
            value,
            data,
            operation,
            type(uint256).max
        );

        bytes memory returnData = Exec.getReturnData(type(uint256).max);
        // Revert with the actual reason string
        // Adopted from: https://github.com/Uniswap/v3-periphery/blob/464a8a49611272f7349c970e0fadb7ec1d3c1086/contracts/base/Multicall.sol#L16-L23
        if (!success) {
            if (returnData.length < 68) revert();
            assembly {
                returnData := add(returnData, 0x04)
            }
            revert(abi.decode(returnData, (string)));
        }
    }

    /**
     * Helper for wallet to get the next nonce.
     */
    function getNonce() public view returns (uint256) {
        return IEntryPoint(entryPoint).getNonce(address(this), 0);
    }

    /**
     * set up a safe as EIP-4337 enabled.
     * called from the GnosisSafeAccountFactory during construction time
     * - enable 3 modules (this module, fallback and the entrypoint)
     * - this method is called with delegateCall, so the module (usually itself) is passed as parameter, and "this" is the safe itself
     */
    function setup4337Modules(
        EIP4337Manager manager //the manager (this contract)
    ) external {
        Safe safe = Safe(payable(address(this)));
        require(!safe.isModuleEnabled(manager.entryPoint()), "setup4337Modules: entrypoint already enabled");
        require(!safe.isModuleEnabled(manager.eip4337Fallback()), "setup4337Modules: eip4337Fallback already enabled");
        safe.enableModule(manager.entryPoint());
        safe.enableModule(manager.eip4337Fallback());
    }

    /**
     * replace EIP4337 module, to support a new EntryPoint.
     * must be called using execTransaction and Enum.Operation.DelegateCall
     * @param prevModule returned by getCurrentEIP4337Manager
     * @param oldManager the old EIP4337 manager to remove, returned by getCurrentEIP4337Manager
     * @param newManager the new EIP4337Manager, usually with a new EntryPoint
     */
    function replaceEIP4337Manager(address prevModule, EIP4337Manager oldManager, EIP4337Manager newManager) public {
        Safe pThis = Safe(payable(address(this)));
        address oldFallback = oldManager.eip4337Fallback();
        require(pThis.isModuleEnabled(oldFallback), "replaceEIP4337Manager: oldManager is not active");
        pThis.disableModule(oldFallback, oldManager.entryPoint());
        pThis.disableModule(prevModule, oldFallback);

        address eip4337fallback = newManager.eip4337Fallback();

        pThis.enableModule(newManager.entryPoint());
        pThis.enableModule(eip4337fallback);
        pThis.setFallbackHandler(eip4337fallback);

        validateEip4337(pThis, newManager);
    }

    /**
     * Validate this gnosisSafe is callable through the EntryPoint.
     * the test is might be incomplete: we check that we reach our validateUserOp and fail on signature.
     *  we don't test full transaction
     */
    function validateEip4337(Safe safe, EIP4337Manager manager) public {

        // this prevents mistaken replaceEIP4337Manager to disable the module completely.
        // minimal signature that pass "recover"
        bytes memory sig = new bytes(66);
        sig[0] = bytes1(uint8(1)); // ecdsa
        sig[1+64] = bytes1(uint8(27));
        sig[1+2] = bytes1(uint8(1));
        sig[1+35] = bytes1(uint8(1));
        uint256 nonce = uint256(IEntryPoint(manager.entryPoint()).getNonce(address(safe), 0));
        UserOperation memory userOp = UserOperation(address(safe), nonce, "", "", 0, 1000000, 0, 0, 0, "", sig);
        UserOperation[] memory userOps = new UserOperation[](1);
        userOps[0] = userOp;
        IEntryPoint _entryPoint = IEntryPoint(payable(manager.entryPoint()));
        try _entryPoint.handleOps(userOps, payable(msg.sender)) {
            revert("validateEip4337: handleOps must fail");
        } catch (bytes memory error) {
            if (keccak256(error) != keccak256(abi.encodeWithSignature("FailedOp(uint256,string)", 0, "AA24 signature error"))) {
                revert(string(error));
            }
        }
    }
    /**
     * enumerate modules, and find the currently active EIP4337 manager (and previous module)
     * @return prev prev module, needed by replaceEIP4337Manager
     * @return manager the current active EIP4337Manager
     */
    function getCurrentEIP4337Manager(Safe safe) public view returns (address prev, address manager) {
        prev = address(SENTINEL_MODULES);
        (address[] memory modules,) = safe.getModulesPaginated(SENTINEL_MODULES, 100);
        for (uint i = 0; i < modules.length; i++) {
            address module = modules[i];
            try EIP4337Fallback(module).eip4337manager() returns (address _manager) {
                return (prev, _manager);
            }
            // solhint-disable-next-line no-empty-blocks
            catch {}
            prev = module;
        }
        return (address(0), address(0));
    }
}
