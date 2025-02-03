import Deployer from './Deployer.js';

const deployer = new Deployer();

const network = await deployer.readNetworkFile('holesky');
deployer.setNetwork(network);

