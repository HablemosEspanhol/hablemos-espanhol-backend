function getLocalDateTimeAsString() {
    const dataLocal = new Date();
    const offset = dataLocal.getTimezoneOffset() * 60000;
    const dataAjustada = new Date(dataLocal.getTime() - offset);
    return dataAjustada.toISOString().slice(0, -1);
}

function genericLog(type, ...message) {
    var timestamp = getLocalDateTimeAsString();
    console[type](timestamp, type.toUpperCase(), ...message);
}

const Logger = {
    info: (...message) => {
        genericLog('log', ...message);
    },
    error: (...message)=> {
        genericLog('error', ...message);
    }
}

export default Logger;