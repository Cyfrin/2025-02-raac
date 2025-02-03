export const DEPLOYER_EVENTS = {
    // Process lifecycle events
    PROCESS_START: 'PROCESS_START',
    PROCESS_COMPLETE: 'PROCESS_COMPLETE',
    PROCESS_ERROR: 'PROCESS_ERROR',

    // Input events
    INPUT_REQUIRED: 'INPUT_REQUIRED',
    INPUT_RECEIVED: 'INPUT_RECEIVED',

    // Confirmation events
    CONFIRMATION_REQUIRED: 'CONFIRMATION_REQUIRED',
    CONFIRMATION_RECEIVED: 'CONFIRMATION_RECEIVED',

    // Status events
    STATUS_UPDATE: 'STATUS_UPDATE',
    PROGRESS_UPDATE: 'PROGRESS_UPDATE',

    // Transaction events
    TRANSACTION_START: 'TRANSACTION_START',
    TRANSACTION_HASH: 'TRANSACTION_HASH',
    TRANSACTION_CONFIRMED: 'TRANSACTION_CONFIRMED',
    TRANSACTION_ERROR: 'TRANSACTION_ERROR'
}; 