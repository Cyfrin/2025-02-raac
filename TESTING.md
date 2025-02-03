# Testing and Security

This repository contains a number of tools and scripts to help with testing and security.

Using hardhat, the `npx hardhat test` command will run all the tests in the `test` directory.
The internal E2E tests reuse the `library` that is used by the frontend.

#### Smart Contract Analysis

We use Slither for static analysis of our smart contracts.

### Installing Slither

To install Slither, using a virtual environment:

#### Create a virtual environment and activate it:
   ```
   python3 -m venv ./venv/
   python3 -m venv ./venv/slither-env
   source ./venv/slither-env/bin/activate
   ```

#### Install Slither:
   ```
   pip install slither-analyzer
   ```

### Running Slither

To analyze the smart contracts, run:

```
slither .
```