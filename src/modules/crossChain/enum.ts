export enum SWFTC {
    IOS = 'iOS',
    EQUIPMENT = '123456568',
}
export enum SWFTC_STATUS {
    PENDING = 'pending',
    FAILED = 'failed',
    COMPLETED = 'completed'
}
export enum SWFTC_RESPONSE {
    RECEIVE = 'receive_complete',
    COMPLETE = 'complete',
    WAIT_DEPOSIT = 'wait_deposit_send',
    WAIT_PUSH = 'wait_exchange_push',
    ERROR = 'ERROR/error',
    WAIT_CONFIRM = 'wait_refund_Confirm',
    WAIT_SEND = 'wait_refund_Send',
    WAIT_REC_CONFIRM = 'wait_receive_confirm',
    WAIT_REC_SEND = 'wait_receive_send',
    WAIT_RETURN = 'wait_exchange_return',
    REFRESH_COMPLETE = 'refresh_Complete',
    WAIT_KYC = 'WAIT_KYC',
    TIMEOUT = 'timeout',
    REFUND_COMPLETE = 'refund_complete'
}



