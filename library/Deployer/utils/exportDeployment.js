function exportDeployment(deployment) {
    const deploymentCopy = { ...deployment };
    delete deploymentCopy.getWallet;
    delete deploymentCopy.provider;

    for (const process of Object.values(deploymentCopy.processes)) {
        delete process?.artifacts;
        delete process?.logger;
    }
    return deploymentCopy;
}

export default exportDeployment;