export enum MessageTypeId {
    CALL = 2,
    CALLRESULT = 3,
    CALLERROR = 4
}

export type OcppCall<TPayload = any> = [MessageTypeId.CALL, string, string, TPayload];
export type OcppCallResult<TPayload = any> = [MessageTypeId.CALLRESULT, string, TPayload];
export type OcppCallError = [MessageTypeId.CALLERROR, string, string, string, any];

export type OcppAction =
    | "BootNotification"
    | "Heartbeat"
    | "StatusNotification"
    | "StartTransaction"
    | "StopTransaction"
    | "MeterValues"
    | "Authorize";
