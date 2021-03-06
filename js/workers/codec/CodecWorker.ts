const prefix = "[CodecWorker] ";
const workerCallbackToken = "callback_token";

interface CodecWorker {
    name();
    initialise?() : string;
    deinitialise();
    decode(data: Uint8Array);
    encode(data: Float32Array) : Uint8Array | string;

    reset();
}

enum CodecWorkerType {
    WORKER_OPUS
}

let codecInstance: CodecWorker;

onmessage = function(e) {
    let data = JSON.parse(e.data);

    let res: any = {};
    res.token = data.token;
    res.success = false;

    //console.log(prefix + " Got from main: %o", data);
    switch (data.command) {
        case "initialise":
            console.log(prefix + "Got initialize for type " + CodecWorkerType[data.type as CodecWorkerType]);
            switch (data.type as CodecWorkerType) {
                case CodecWorkerType.WORKER_OPUS:
                    codecInstance = new OpusWorker(data.channelCount, data.channelCount == 1 ? OpusType.VOIP : OpusType.AUDIO);
                    break;

                default:
                    res.message = "Could not find worker type!";
                    console.error("Could not resolve opus type!");
                    return;
            }

            let error = codecInstance.initialise();
            if(error)
                res["message"] = error;
            else
                res["success"] = true;
            break;
        case "encodeSamples":
            let encodeArray = new Float32Array(data.dataLength);
            for(let index = 0; index < encodeArray.length; index++)
                encodeArray[index] = data.data[index];

            let encodeResult = codecInstance.encode(encodeArray);

            if(typeof encodeResult === "string") {
                res.message = encodeResult;
            } else {
                res.success = true;
                res.data = encodeResult;
                res.dataLength = encodeResult.length;
            }
            break;
        case "decodeSamples":
            let decodeArray = new Uint8Array(data.dataLength);
            for(let index = 0; index < decodeArray.length; index++)
                decodeArray[index] = data.data[index];

            let decodeResult = codecInstance.decode(decodeArray);

            if(typeof decodeResult === "string") {
                res.message = decodeResult;
            } else {
                res.success = true;
                res.data = decodeResult;
                res.dataLength = decodeResult.length;
            }
            break;
        case "reset":
            codecInstance.reset();
            break;
        default:
            console.error(prefix + "Unknown type " + data.command);
    }

    if(res.token && res.token.length > 0) sendMessage(res, e.origin);
};

declare function postMessage(message: any): void;
function sendMessage(message: any, origin?: string){
    //console.log(prefix + " Send to main: %o", message);
    postMessage(JSON.stringify(message));
}