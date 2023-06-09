// import {
//   ERC4337EthersProvider,
//   HttpRpcClient,
//   calcPreVerificationGas,
// } from "@account-abstraction/sdk";
// import { UserOperationStruct } from "@account-abstraction/contracts";
// import { TransactionDetailsForUserOp } from "@account-abstraction/sdk/dist/src/TransactionDetailsForUserOp";
// import { BigNumber, BigNumberish, Contract, Wallet, ethers } from "ethers";
// import { arrayify, hexConcat, resolveProperties } from "ethers/lib/utils";
// import { getUserOpHash } from "@account-abstraction/utils";
// import {
//   SimpleAccount,
//   SimpleAccount__factory,
//   SimpleAccountFactory,
//   SimpleAccountFactory__factory,
//   EntryPoint__factory,
// } from "@account-abstraction/contracts";

// interface NewTransactionButtonProps {
//   provider: ERC4337EthersProvider | undefined;
//   regularProvider: ethers.providers.JsonRpcProvider;
//   signer: Wallet;
// }

// const entryPointAddress = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
// const chainId = 31337;
// const recipient = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // Hardhat Account 3/4?
// const factoryAddress = "0x9406Cc6185a346906296840746125a0E44976454";

// const NewTransactionButton = ({
//   provider,
//   regularProvider,
//   signer,
// }: NewTransactionButtonProps) => {
//   const newTransaction = async () => {
//     console.log("Pressed the button");

//     const tx = {
//       to: recipient,
//       data: "0x",
//       value: ethers.utils.parseEther("0.1"),
//       gasLimit: BigNumber.from(100_000),
//     };

//     const userOperation = await createSignedUserOp({
//       target: tx.to ?? "",
//       data: tx.data?.toString() ?? "",
//       value: tx.value,
//       gasLimit: tx.gasLimit,
//     });

//     // const userOperation = await createSignedUserOp({
//     //   target: transaction.to,
//     //   data: transaction.data
//     //     ? ethers.utils.hexConcat([transaction.data])
//     //     : "0x",
//     //   value: transaction.value
//     //     ? ethers.BigNumber.from(transaction.value)
//     //     : undefined,
//     //   gasLimit: transaction.gasLimit,
//     //   maxFeePerGas: transaction.maxFeePerGas,
//     //   maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
//     // });

//     await sendUserOp(recipient, userOperation);
//   };

//   const sendUserOp = async (
//     address: string,
//     userOp: UserOperationStruct
//   ): Promise<string | null> => {
//     const bundlerUrl = "http://localhost:3000/rpc";
//     const bundler = new HttpRpcClient(bundlerUrl, entryPointAddress, chainId);
//     if (bundler) {
//       const userOpHash = await bundler.sendUserOpToBundler(userOp);
//       // const keyring = this.keyrings[address];
//       // return await keyring.getUserOpReceipt(userOpHash);
//     }
//     return null;
//   };

//   /**
//    * helper method: create and sign a user operation.
//    * @param info transaction details for the userOp
//    */
//   const createSignedUserOp = async (
//     info: TransactionDetailsForUserOp
//   ): Promise<UserOperationStruct> => {
//     return await signUserOp(await createUnsignedUserOp(info));
//   };

//   /**
//    * Sign the filled userOp.
//    * @param userOp the UserOperation to sign (with signature field ignored)
//    */
//   const signUserOp = async (
//     userOp: UserOperationStruct
//   ): Promise<UserOperationStruct> => {
//     debugger;
//     const op = await resolveProperties(userOp);
//     const userOpHash = getUserOpHash(op, entryPointAddress, chainId);
//     // const userOpHash = await this.getUserOpHash(userOp);
//     const signature = signUserOpHash(userOpHash);
//     return {
//       ...userOp,
//       signature,
//     };
//   };

//   const signUserOpHash = async (userOpHash: string): Promise<string> => {
//     return await signer.signMessage(arrayify(userOpHash));
//   };

//   /**
//    * create a UserOperation, filling all details (except signature)
//    * - if account is not yet created, add initCode to deploy it.
//    * - if gas or nonce are missing, read them from the chain (note that we can't fill gaslimit before the account is created)
//    * @param info
//    */
//   const createUnsignedUserOp = async (
//     info: TransactionDetailsForUserOp
//   ): Promise<UserOperationStruct> => {
//     const { callData, callGasLimit } = await encodeUserOpCallDataAndGasLimit(
//       info
//     );
//     // const callData = "";
//     // const callGasLimit = BigNumber.from(100_000);
//     const initCode = await getInitCode();

//     const initGas = await estimateCreationGas(initCode);

//     const verificationGasLimit = BigNumber.from(100000).add(initGas);

//     let { maxFeePerGas, maxPriorityFeePerGas } = info;
//     if (maxFeePerGas == null || maxPriorityFeePerGas == null) {
//       const feeData = await provider?.getFeeData();
//       if (maxFeePerGas == null) {
//         maxFeePerGas = feeData?.maxFeePerGas ?? undefined;
//       }
//       if (maxPriorityFeePerGas == null) {
//         maxPriorityFeePerGas = feeData?.maxPriorityFeePerGas ?? undefined;
//       }
//     }

//     const partialUserOp: any = {
//       sender: await getAccountAddress(),
//       nonce: info.nonce ?? getNonce(),
//       initCode,
//       callData,
//       callGasLimit,
//       verificationGasLimit,
//       maxFeePerGas,
//       maxPriorityFeePerGas,
//       paymasterAndData: "0x",
//     };

//     let paymasterAndData: string | undefined;
//     // TODO: Don't need a paymaster yet
//     // if (paymasterAPI != null) {
//     //   // fill (partial) preVerificationGas (all except the cost of the generated paymasterAndData)
//     //   const userOpForPm = {
//     //     ...partialUserOp,
//     //     preVerificationGas: await getPreVerificationGas(partialUserOp),
//     //   };
//     //   paymasterAndData = await paymasterAPI.getPaymasterAndData(userOpForPm);
//     // }
//     partialUserOp.paymasterAndData =
//       paymasterAndData ?? ethers.utils.arrayify("0x");
//     debugger;
//     console.log("partialUserOp", partialUserOp);
//     const preVerificationGas = calcPreVerificationGas(partialUserOp);
//     debugger;

//     return {
//       ...partialUserOp,
//       preVerificationGas: BigNumber.from(preVerificationGas),
//       signature: "",
//     };
//   };

//   const encodeUserOpCallDataAndGasLimit = async (
//     detailsForUserOp: TransactionDetailsForUserOp
//   ): Promise<{ callData: string; callGasLimit: BigNumber }> => {
//     function parseNumber(a: any): BigNumber | null {
//       if (a == null || a === "") return null;
//       return BigNumber.from(a.toString());
//     }

//     const value = parseNumber(detailsForUserOp.value) ?? BigNumber.from(0);
//     const callData = await encodeExecute(
//       detailsForUserOp.target,
//       value,
//       detailsForUserOp.data
//     );

//     const callGasLimit =
//       parseNumber(detailsForUserOp.gasLimit) ??
//       (await regularProvider.estimateGas({
//         from: entryPointAddress,
//         to: recipient,
//         data: callData,
//       }));

//     return {
//       callData,
//       callGasLimit,
//     };
//   };

//   /**
//    * encode a method call from entryPoint to our contract
//    * @param target
//    * @param value
//    * @param data
//    */
//   const encodeExecute = async (
//     target: string,
//     value: BigNumberish,
//     data: string
//   ): Promise<string> => {
//     const accountContract = await _getAccountContract();
//     return accountContract.interface.encodeFunctionData("execute", [
//       target,
//       value,
//       data,
//     ]);
//   };

//   const _getAccountContract = async (): Promise<SimpleAccount> => {
//     return SimpleAccount__factory.connect(
//       await getAccountAddress(),
//       regularProvider
//     );
//   };

//   /**
//    * return initCode value to into the UserOp.
//    * (either deployment code, or empty hex if contract already deployed)
//    */
//   const getInitCode = async (): Promise<string> => {
//     const address = await getAccountAddress();
//     const senderAddressCode = await regularProvider.getCode(address);
//     const accountExists = senderAddressCode.length > 2;
//     if (accountExists) {
//       return await getAccountInitCode();
//     }
//     return "0x";
//   };

//   const getAccountAddress = async () => {
//     const initCode = await getAccountInitCode();
//     try {
//       const entryPointView = EntryPoint__factory.connect(
//         entryPointAddress,
//         regularProvider
//       ).connect(ethers.constants.AddressZero);
//       await entryPointView.callStatic.getSenderAddress(initCode);
//     } catch (e: any) {
//       if (e.errorArgs == null) {
//         throw e;
//       }
//       return e.errorArgs.sender;
//     }
//     throw new Error("must handle revert");
//   };

//   /**
//    * return the value to put into the "initCode" field, if the account is not yet deployed.
//    * this value holds the "factory" address, followed by this account's information
//    */
//   const getAccountInitCode = async (): Promise<string> => {
//     const factory = SimpleAccountFactory__factory.connect(
//       factoryAddress,
//       regularProvider
//     );
//     return hexConcat([
//       factory.address,
//       factory.interface.encodeFunctionData("createAccount", [
//         await signer.getAddress(),
//         // this.index,
//         1, // TODO: What should this be?
//       ]),
//     ]);
//   };

//   const estimateCreationGas = async (
//     initCode?: string
//   ): Promise<BigNumberish> => {
//     if (initCode == null || initCode === "0x") return 0;
//     const deployerAddress = initCode.substring(0, 42);
//     const deployerCallData = "0x" + initCode.substring(42);
//     return await regularProvider.estimateGas({
//       to: deployerAddress,
//       data: deployerCallData,
//     });
//   };

//   const getNonce = async (): Promise<BigNumber> => {
//     const senderAddressCode = await regularProvider.getCode(
//       await getAccountAddress()
//     );
//     const accountExists = senderAddressCode.length > 2;
//     if (!accountExists) {
//       return BigNumber.from(0);
//     }

//     const accountContract = await _getAccountContract();
//     return await accountContract.getNonce();
//   };

//   return (
//     <button onClick={newTransaction} className="p-2 rounded-lg bg-green-500">
//       New Transaction
//     </button>
//   );
// };
// export default NewTransactionButton;

export {};
