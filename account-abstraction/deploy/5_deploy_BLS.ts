import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'

const deployBLS: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const provider = ethers.provider
  const from = await provider.getSigner().getAddress()
  const network = await provider.getNetwork()
  // only deploy on local test network.
  if (network.chainId !== 31337 && network.chainId !== 1337) {
    return
  }

  const blsOpenRet = await hre.deployments.deploy(
    'BLSOpen', {
      from,
      args: [],
      gasLimit: 6e6,
      log: true,
      deterministicDeployment: true
    })
    console.log('==BLSOpen addr=', blsOpenRet.address)
}

export default deployBLS
