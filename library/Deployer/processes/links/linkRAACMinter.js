import { ethers } from "ethers";

export async function linkRAACMinter(deployer, config, deployment) {

    const processResult = {
        timeStart: +new Date(),
    };
    deployer.logger.addLog('\x1b[36mLINK_RAACMINTER_START\x1b[0m', { config, timeStart: processResult.timeStart });

    const wallet = deployment.getWallet();

    // Give ownership of RAAC to RAACMinter
    const RAAC = deployment.contracts['RAACToken'];
    const RAACAddress = RAAC?.address || RAAC;
    const RAACMinter = deployment.contracts['RAACMinter'];
    const RAACMinterAddress = RAACMinter?.address || RAACMinter;


    const RAACArtifact = await deployer.readArtifactFile("RAACToken");
    const RAACContract = new ethers.Contract(RAACAddress, RAACArtifact.abi, wallet);


    const RAACMinterArtifact = await deployer.readArtifactFile("RAACMinter");
    const RAACMinterContract = new ethers.Contract(RAACMinterAddress, RAACMinterArtifact.abi, wallet);

    const currentRAACOwner = await RAACContract.owner();

    deployer.logger.addLog(
        currentRAACOwner !== RAACMinterAddress ? 
            'LINK_RAACMINTER_RAAC_OWNER_MISMATCH' : 
            'LINK_RAACMINTER_RAAC_OWNER_MATCH',
        { message: `RAAC owner (${currentRAACOwner}) is ${currentRAACOwner !== RAACMinterAddress ? 'not ' : ''}RAACMinter (${RAACMinterAddress})` }
    );


    // SetMinter and setBurner for RAAC
    const setMinterTx = await RAACContract.setMinter(RAACMinterAddress);
    const setMinterReceipt = await setMinterTx.wait();
    deployer.logger.addLog('LINK_RAACMINTER_SET_MINTER', { tx: setMinterReceipt });

   


    // const RAACOwner = await RAACContract.owner();
    // if(RAACOwner !== RAACMinterAddress) {
    //     deployer.logger.addLog('LINK_RAACMINTER_RAAC_OWNER_MISMATCH', { message: 'RAAC owner is not RAACMinter' });
    //     const transferOwnershipTx = await RAACContract.transferOwnership(RAACMinterAddress);
    //     const transferOwnershipReceipt = await transferOwnershipTx.wait();
    //     deployer.logger.addLog('LINK_RAACMINTER_TRANSFER_OWNERSHIP', { tx: transferOwnershipReceipt });
    // }

    // // Set RAACMinter as minter of RAAC
    // const setMinterTx = await RAACContract.setMinter(RAACMinterAddress);
    // const setMinterReceipt = await setMinterTx.wait();
    // deployer.logger.addLog('LINK_RAACMINTER_SET_MINTER', { tx: setMinterReceipt });

    // // Set RAACMinter as burner of RAAC
    // const setBurnerTx = await RAACContract.setBurner(RAACMinterAddress);
    // const setBurnerReceipt = await setBurnerTx.wait();
    // deployer.logger.addLog('LINK_RAACMINTER_SET_BURNER', { tx: setBurnerReceipt });

    // process.exit(0);
    return deployment;
}