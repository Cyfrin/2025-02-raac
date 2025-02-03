# Contributing to RAAC

This guide outlines the process and guidelines for contributing code, documentation, tests, and more.

## Table of Contents

- [Getting Started](#getting-started)
- [Code Style Guidelines](#code-style-guidelines)
  - [Solidity Coding Standards](#solidity-coding-standards)
  - [Naming Conventions](#naming-conventions)
  - [Formatting and Structure](#formatting-and-structure)
- [Documentation Guidelines](#documentation-guidelines)
  - [NatSpec Format](#natspec-format)
  - [Error Messages](#error-messages)
  - [Event Documentation](#event-documentation)
- [Testing Guidelines](#testing-guidelines)
- [Commit Messages and Pull Requests](#commit-messages-and-pull-requests)
- [Security Considerations](#security-considerations)
- [Dependencies and Libraries](#dependencies-and-libraries)
- [Additional Resources](#additional-resources)

## Getting Started

1. **Fork the Repository**: Start by forking the repository to your own GitHub account.

   ```bash
   git clone https://github.com/RegnumAurumAcquisionCorp/core.git
   cd core
   ```

2. **Install Dependencies**: Install the necessary dependencies as outlined in the [README](README.md).

3. **Create a Branch**: Create a new branch for your feature or bug fix.

   ```bash
   git checkout -b feature/your-feature-name
   ```

## Code Style Guidelines

To maintain consistency and readability across the codebase, please adhere to the following code style guidelines.

### Solidity Coding Standards

- Use **Solidity version `^0.8.19`**.
- Follow the [Solidity Style Guide](https://docs.soliditylang.org/en/v0.8.19/style-guide.html).
- Always include visibility (`public`, `private`, etc.) and mutability (`view`, `pure`, etc.) modifiers explicitly.
- Use **0.8.x** safe math features; avoid using external SafeMath libraries unless necessary.

### Naming Conventions

- **Contracts and Libraries**: Use `PascalCase` (e.g., `MyContract`).
- **Functions and Variables**: Use `camelCase` (e.g., `myFunction`, `myVariable`).
- **Constants**: Use `ALL_CAPS_WITH_UNDERSCORES` (e.g., `MAX_LOCK_DURATION`).
- **Events**: Use `PascalCase` with past tense verbs (e.g., `TokensMinted`).

### Formatting and Structure

- Braces `{}`: Place the opening brace on the same line as the declaration.

  ```solidity
  if (condition) {
      // Code block
  } else {
      // Code block
  }
  ```

- Spacing: Use a single space between keywords and parentheses, and around operators.

  ```solidity
  uint256 public totalSupply = 0;
  for (uint256 i = 0; i < array.length; i++) {
      // ...
  }
  ```

- **Order of Layout in Contracts**:

  1. Pragma statements
  2. Imports
  3. Interfaces
  4. Libraries
  5. Contracts:

     - State variables
     - Events
     - Modifiers
     - Functions

## Documentation Guidelines

Clear and comprehensive documentation is essential. We use the Ethereum Natural Specification Format (NatSpec) for documenting our code.

### NatSpec Format

Include the following tags where appropriate:

- `@title` and `@author`

  - For all contracts, libraries, interfaces, structs, and enums.

  ```solidity
  /**
   * @title Vote Escrowed RAAC Token
   * @author 
   */
  contract veRAACToken { ... }
  ```

- `@notice`

  - Explains to an end-user what the contract or function does.
  - Required for public/external functions, public state variables, events, and errors.

  ```solidity
  /**
   * @notice Locks RAAC tokens for a specified duration.
   */
  ```

- `@dev`

  - Provides extra details for developers.
  - Use for contracts, functions, state variables, events, structs, enums, and errors.

  ```solidity
  /**
   * @dev Calculates the voting power based on lock duration.
   */
  ```

- `@param`

  - Documents function parameters.

  ```solidity
  /**
   * @param amount The amount of RAAC tokens to lock.
   * @param duration The duration to lock tokens for, in seconds.
   */
  ```

- `@return`

  - Documents the return variables of a function.

  ```solidity
  /**
   * @return The calculated voting power.
   */
  ```

- `@inheritdoc`

  - Copies all missing tags from the base function (must be followed by the contract name).

- **Example of a Fully Documented Function**:

  ```solidity
  /**
   * @notice Creates a new lock position for RAAC tokens.
   * @dev Locks RAAC tokens for a specified duration and mints veRAAC tokens representing voting power.
   * @param amount The amount of RAAC tokens to lock.
   * @param duration The duration to lock tokens for, in seconds.
   */
  function lock(uint256 amount, uint256 duration) external nonReentrant whenNotPaused {
      // Function implementation
  }
  ```

### Error Messages

- Use **custom errors** (available since Solidity 0.8.4) for better gas efficiency.

  ```solidity
  /**
   * @notice Thrown when a zero amount is provided.
   */
  error InvalidAmount();
  ```

- **Naming**: Use descriptive, `PascalCase` names for errors.
- **Documentation**: Provide a brief description using NatSpec.

### Event Documentation

- Document all events with NatSpec, including parameter descriptions.

  ```solidity
  /**
   * @notice Emitted when a user creates a new lock.
   * @param user The address of the user.
   * @param amount The amount of tokens locked.
   * @param unlockTime The timestamp when tokens can be withdrawn.
   */
  event LockCreated(address indexed user, uint256 amount, uint256 unlockTime);
  ```

- Explain the context in which events are emitted.
- Justify the indexing of event parameters if necessary.

## Testing Guidelines

- Ensure that all new code is covered by automated tests.
- Write tests for:

  - **Functionality**: Test all logical paths, including edge cases.
  - **Security**: Test for common vulnerabilities (reentrancy, overflows, underflows).
  - **Gas Optimization**: Check that gas usage is within acceptable limits.

- Use descriptive names for test cases.
- Follow the existing test suite structure and conventions.

## Commit Messages and Pull Requests

### Commit Messages

- Use semantic commit messages following the format:

  ```
  type(scope): subject line (50 chars or less)

  Detailed description explaining the changes and reasoning.
  ```

- Types:
  - `feat`: New features
  - `fix`: Bug fixes 
  - `docs`: Documentation changes
  - `style`: Code style/formatting changes
  - `refactor`: Code refactoring
  - `test`: Adding/modifying tests
  - `chore`: Build, tooling, CI changes

- Scope: Optional component/module name in parentheses
- Subject: Use imperative mood (e.g., "add feature" not "added feature")
- Body: Explain what and why vs. how

Example:
  ```
  feat(auth): implement JWT authentication (closes #123)
  ```

### Pull Requests

- Provide a clear description of the changes.
- Reference any relevant issues or tasks.
- Ensure your branch is up-to-date with the `main` branch.
- Include any relevant screenshots or logs if applicable.
- Request reviews from relevant team members.

## Security Considerations

- Always follow best practices for security.
- Common considerations:

  - **Reentrancy**: Use `nonReentrant` modifiers where applicable.
  - **Access Control**: Ensure functions have appropriate access modifiers.
  - **Integer Overflows/Underflows**: Arithmetics in Solidity 0.8.x have built-in overflow and underflow checks.
  - **Avoid Using `tx.origin`**: Use `msg.sender` for authorization.
  - **External Calls**: Be cautious with external calls; avoid state changes after external calls when possible.

- If introducing a significant change, consider performing a security audit.

## Dependencies and Libraries

- Use **OpenZeppelin Contracts** where appropriate for well-tested implementations.
- Required libraries from our codebase:

  - `LockManager`
  - `BoostCalculator`
  - `PowerCheckpoint`
  - `VotingPowerLib`

- Ensure that any new dependencies are justified and reviewed for security.

## Additional Resources

- **Solidity Documentation**: [Solidity Docs](https://docs.soliditylang.org/)
- **NatSpec Format**: [NatSpec Format](https://docs.soliditylang.org/en/v0.8.19/natspec-format.html)
- **OpenZeppelin Contracts**: [OpenZeppelin Docs](https://docs.openzeppelin.com/contracts/)
- **Security Best Practices**: [Smart Contract Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- **Ethereum Improvement Proposals (EIPs)**: [EIPs](https://eips.ethereum.org/)

---

By following these guidelines, you help ensure that our codebase remains clean, maintainable, and secure. 
We appreciate your contributions!

If you have any questions or need assistance, feel free to reach out by openning an issue.

Thank you for contributing!

