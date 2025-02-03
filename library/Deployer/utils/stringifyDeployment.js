import exportDeployment from './exportDeployment.js';

function stringifyDeployment(deployment) {
    return JSON.stringify(
        exportDeployment(deployment),
        (_, value) => (typeof value === "bigint" ? value.toString() : value),
        2
    );
}

export default stringifyDeployment;