class Deployer {
  hre;
  deployer;

  constructor(hre, deployer) {
    this.hre = hre;
    this.deployer = deployer ?? null;
  }

  async getDeployer() {
    if (!this.deployer) {
      this.deployer = (await this.hre.ethers.getSigner()).address;
    }
    return this.deployer;
  }
  
  async deploy(contractName, args = [], signer) {
    console.log(`\x1b[33m%s\x1b[0m`, `Deploying ${contractName}...`);

    let deployer = signer ?? await this.getDeployer();
    
    const getContractFactory = this.hre?.ethers?.getContractFactory ?? this.hre?.getContractFactory;
    const parseUnits = this.hre?.ethers?.parseUnits ?? this.hre?.parseUnits;

    const Contract = await getContractFactory(contractName, deployer);
    
    try {
      const balanceBefore = await this.hre.ethers.provider.getBalance(deployer.address);

      const instance = await Contract.deploy(...args, {
        gasLimit: '10000000',
        maxFeePerGas: parseUnits('25', 'gwei'),
        maxPriorityFeePerGas: parseUnits('5', 'gwei'),
      });
      let instanceAddress = null;
      let constructorArgs = null;
      if(instance.waitForDeployment) {
        await instance.waitForDeployment();
        instanceAddress = await instance.getAddress();
      } else {
        await instance.deployed();
        instanceAddress = instance.address;
      }

      const balanceAfter = await this.hre.ethers.provider.getBalance(deployer.address);
      const deploymentCost = balanceBefore - balanceAfter;
      const deploymentCostInEth = this.hre.ethers.formatEther(deploymentCost);

      // Get the transaction data
      const txData = instance.deploymentTransaction?.data || instance.deployTransaction?.data;
      // Get constructor fragment
      const contractInterface = instance.interface;
      const constructorFragment = contractInterface.fragments.find(fragment => fragment.type === 'constructor');
      
      // Map constructor inputs to passed values
       constructorArgs = {};
      if (constructorFragment && constructorFragment.inputs) {
        constructorFragment.inputs.forEach((input, index) => {
          // Get the value of the input
          let value = args[index];
          // Sanitize value (like with BigInts)
          value = value.toString();
          constructorArgs[input.name] = value;
        });
      }
      // Stupid to spend time looking for ".address", let's set it already
      if(!instance.address) {
        instance.address = instanceAddress;
      }
      console.log(`\x1b[32m%s\x1b[0m`, `${contractName} deployed at: ${instanceAddress} with constructor args: ${JSON.stringify(constructorArgs)}. Deployed by: ${JSON.stringify(deployer)}`);
      console.log(`\x1b[32m%s\x1b[0m`, `Deployment cost: ${deploymentCostInEth} ETH`);
      return instance;
    } catch (error) {
      console.log(`\x1b[31m%s\x1b[0m`, `Deployment failed for ${contractName}`);
      console.log(`\x1b[31m%s\x1b[0m`,`Args: ${args} (${args.length} args)`);
      console.log(`\x1b[31m%s\x1b[0m`,`Signer: ${deployer.address}`);
      console.log(`\x1b[31m%s\x1b[0m`,`${error}`);
      console.dir(error, { depth: null });
      if (error.reason) {
        console.error("Reason:", error.reason);
    }
    if (error.code) {
        console.error("Error code:", error.code);
    }
    if (error.transaction) {
        console.error("Transaction data:", error.transaction);
    }
      throw error;
    }
    
 
  }

}

export default Deployer;