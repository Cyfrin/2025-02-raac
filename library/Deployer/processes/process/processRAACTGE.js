import { ethers } from "ethers";

function parseBigInt(value) {
    return BigInt(value);
}

export async function processRAACTGE(deployer, config, deployment) {
    const processResult = {
        timeStart: +new Date(),
    };

    deployer.logger.addLog('PROCESS_RAACTGE_START', { config });

    const wallet = deployment.getWallet();

    const RAAC = deployment.contracts['RAACToken'];
    const RAACAddress = RAAC?.address || RAAC;

    const RAACArtifact = await deployer.readArtifactFile("RAACToken");
    const RAACContract = new ethers.Contract(RAACAddress, RAACArtifact.abi, wallet);

    const RAACBalance = await RAACContract.totalSupply();
    const RAACOwner = await RAACContract.owner();

    if(deployment.processes.prepareTGE) {
        const { result } = deployment.processes.prepareTGE;
        const { tokenConfig } = result;
        const { wallets, minter, orchestrator, token } = tokenConfig;

        const initialSupply = BigInt(token.initialSupply);

        let expectedSupply = 0n;

        for(const wallet of wallets){
            const { address, amount, type, schedules } = wallet;
            deployer.logger.addLog('PROCESS_RAAC_TGE_WALLET', { address, amount, type, schedules });
            expectedSupply += ethers.parseEther(amount.toString());
        }

        if(expectedSupply !== initialSupply){
            const error = `Expected supply does not match initial supply: ${expectedSupply} !== ${initialSupply}`;
            deployer.logger.addLog('PROCESS_RAAC_TGE_ERROR', { error });
            throw new Error(error);
        }


        const actualSupply = await RAACContract.totalSupply();
        deployer.logger.addLog('PROCESS_RAAC_TGE_ACTUAL_SUPPLY', { actualSupply });
        deployer.logger.addLog('PROCESS_RAAC_TGE_EXPECTED_SUPPLY', { expectedSupply });



        if(actualSupply > expectedSupply){
            const supplyIsGreaterMessage =`Actual supply is greater than expected supply: ${actualSupply} > ${expectedSupply}`;
            deployer.logger.addLog('PROCESS_RAACTGE_ERROR', { error: supplyIsGreaterMessage });
            // throw new Error(supplyIsGreaterMessage);
        }

        if(actualSupply < expectedSupply && actualSupply > 0n){
            deployer.logger.addLog('PROCESS_RAAC_TGE_ERROR', { error: 'Actual supply is less than expected supply but greater than 0' });
            // throw new Error('Actual supply is less than expected supply but greater than 0');
        }
        
        if(expectedSupply === 0n){
            deployer.logger.addLog('PROCESS_RAAC_TGE_ERROR', { error: 'No wallets to distribute' });
            throw new Error('No wallets to distribute');
        }

        const currentOwnerBalance = await RAACContract.balanceOf(RAACOwner);
        deployer.logger.addLog('PROCESS_RAAC_TGE_CURRENT_OWNER_BALANCE', { currentOwnerBalance });
        const neededBalance = expectedSupply;
        deployer.logger.addLog('PROCESS_RAAC_TGE_NEEDED_BALANCE', { neededBalance });
        const mintAmount = neededBalance - currentOwnerBalance;
        deployer.logger.addLog('PROCESS_RAAC_TGE_MINT_AMOUNT', { mintAmount });
        if(mintAmount > 0n){
             // Can we mint ? 
            const minterAddress = await RAACContract.minter();
            deployer.logger.addLog('PROCESS_RAAC_TGE_MINTER_ADDRESS', { minterAddress });
            if(minterAddress !== RAACOwner){
                const RAACMinterAddress = deployment.contracts['RAACMinter'];
                deployer.logger.addLog('PROCESS_RAAC_TGE_ERROR', { error: `Minter is not the owner: ${minterAddress} !== ${RAACOwner}` });
                if(minterAddress === RAACMinterAddress){
                    deployer.logger.addLog('PROCESS_RAAC_TGE_ERROR', { error: `Minter is RAACMinter: ${minterAddress} === ${RAACMinterAddress}` });
                } else {
                    deployer.logger.addLog('PROCESS_RAAC_TGE_ERROR', { error: `Minter is not the owner: ${minterAddress} !== ${RAACOwner}` });
                    throw new Error('Minter is not the owner');
                }
            } else {
                deployer.logger.addLog('PROCESS_RAAC_TGE_MINT', `Minting ${mintAmount} to owner ${RAACOwner} (require ${neededBalance} have ${currentOwnerBalance})`);
                try {
                    const mintTx = await RAACContract.mint(RAACOwner, mintAmount.toString());
                    await mintTx.wait();
                    deployer.logger.addLog('PROCESS_RAAC_TGE_MINT', `Minted ${mintAmount} to owner ${RAACOwner} (require ${neededBalance} have ${currentOwnerBalance})`);
                } catch (error) {
                    deployer.logger.addLog('PROCESS_RAAC_TGE_MINT_ERROR', { error: error.message });
                    const parsedError = RAACContract.interface.parseError(error);
                    deployer.logger.addLog('PROCESS_RAAC_TGE_MINT_ERROR_PARSED', { parsedError });
                    throw parsedError;
                }
            }
        } else {
            deployer.logger.addLog('PROCESS_RAAC_TGE_MINT', `Has enough balance to transfer ${neededBalance}`);
        
        }

        let transferToOrchestratorAmount = 0n;

        const orchestratorArtifact = await deployer.readArtifactFile("RAACReleaseOrchestrator");
        const orchestratorDeploymentData = deployment.contracts['RAACReleaseOrchestrator'];
        const orchestratorAddress = orchestratorDeploymentData?.address || orchestratorDeploymentData;
        const orchestratorContract = new ethers.Contract(orchestratorAddress, orchestratorArtifact.abi, wallet);

        for(const wallet of wallets){
            const { address, amount, type, schedules } = wallet;
            const amountInWei = ethers.parseEther(amount.toString());
            if (schedules && schedules.length > 0) {
                // Handle vesting schedules
                deployer.logger.addLog('PROCESS_RAAC_TGE_VESTING', { address, amount, type, schedules });
                

                

                // Approve orchestrator to handle tokens
                // const approveTx = await RAACContract.approve(orchestratorAddress, amountInWei);
                // await approveTx.wait();
                // deployer.logger.addLog('PROCESS_RAAC_TGE_VESTING_APPROVE', `Approve ${orchestratorAddress} to handle ${amountInWei} tokens`);

                // Create vesting schedule
                for (const schedule of schedules) {
                    const walletType = wallet.type;
                    const { type: scheduleType, start, end } = schedule;
                    transferToOrchestratorAmount += amountInWei;

                    const vestingSchedule = await orchestratorContract.getVestingSchedule(address);
                    const hasVestingSchedule = vestingSchedule[0] > 0n;
                    console.log({hasVestingSchedule});

                    if(hasVestingSchedule){
                        deployer.logger.addLog('PROCESS_RAAC_TGE_VESTING_ALREADY_EXISTS', { address, amount: vestingSchedule[0], vestingSchedule });
                        continue;
                    }
                    try {

                        let rawCategory = walletType.toUpperCase();
                        if(rawCategory === 'DEPLOYER'){
                            rawCategory = 'TEAM';
                        }
                        const encodedCategory = ethers.keccak256(ethers.toUtf8Bytes(rawCategory));
                        deployer.logger.addLog('PROCESS_RAAC_TGE_VESTING_CREATING', { 
                            beneficiary: address, 
                            category: walletType,
                            encodedCategory,
                            amount: amountInWei.toString(),
                            start,
                        });
                        const createLockTx = await orchestratorContract.createVestingSchedule(
                            address,
                            encodedCategory,
                            amountInWei,
                            start,
                        );
                        await createLockTx.wait();
                        deployer.logger.addLog('PROCESS_RAAC_TGE_VESTING_CREATED', { 
                            beneficiary: address, 
                            category: walletType,
                            encodedCategory,
                            amount: amountInWei.toString(),
                            start,
                        });
                    } catch (error) {
                        deployer.logger.addLog('PROCESS_RAAC_TGE_VESTING_ERROR', {
                            error: error.message,
                            address,
                            amount: amountInWei.toString(),
                            start,
                            end,
                            scheduleType
                        });
                        throw error;
                    }
                }
            } else {
                // Direct transfer for non-vested tokens
                deployer.logger.addLog('PROCESS_RAAC_TGE_DIRECT_TRANSFER', { address, amount, type });
                // check if their balance is more than 0
                const balance = await RAACContract.balanceOf(address);
                if(balance > 0n){
                    deployer.logger.addLog('PROCESS_RAAC_TGE_DIRECT_TRANSFER_ALREADY_HAS_BALANCE', { address, amount, type, balance });
                    continue;
                }
                const transferTx = await RAACContract.transfer(address, amountInWei);
                await transferTx.wait();
                deployer.logger.addLog('PROCESS_RAAC_TGE_DIRECT_TRANSFER_SUCCESS', { address, amount, type });
            }
        }

        const currentOrchestratorBalance = await RAACContract.balanceOf(orchestratorAddress);

        if(currentOrchestratorBalance == 0n){
            const transferTx = await RAACContract.transfer(orchestratorAddress, transferToOrchestratorAmount);
            await transferTx.wait();
            deployer.logger.addLog('PROCESS_RAAC_TGE_TRANSFER_TO_ORCHESTRATOR', `Transferred ${transferToOrchestratorAmount} to orchestrator`);
        }

    }

    processResult.timeEnd = +new Date();
    processResult.timeTaken = processResult.timeEnd - processResult.timeStart;

    deployer.logger.addLog('\x1b[32mPROCESS_RAACTGE_SUCCESS\x1b[0m', `Time taken: ${processResult.timeTaken}ms`);
    processResult.logger = deployer.logger.export();

    deployment.processes.processRAACTGE = processResult;

    return deployment;
}