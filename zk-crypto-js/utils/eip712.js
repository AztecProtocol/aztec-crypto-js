const Web3 = require('web3');
const web3 = new Web3();
const eip712 = {};

eip712.encodeTypedData = function encodeTypedData(typedData) {
    const { types, primaryType, domain, message } = typedData;
    
    const { EIP712Domain, ...rest } = types;
    const params = rest || {};
    const structHash = eip712.hashStruct(primaryType, params, message, true).slice(2);
    const domainHash = eip712.hashStruct('EIP712Domain', { EIP712Domain }, domain).slice(2);
    const result = web3.utils.sha3(`0x1901${domainHash}${structHash}`, 'hex');
    return result;
    // return web3.utils.sha3(`0x1901${domainHash}${structHash}`, 'hex');
}

eip712.hashStruct = function hashStruct(primaryType, types, message, debug = false) {
    const typeString = eip712.encodeStruct(primaryType, types, debug);

    const typeHash = web3.utils.sha3(web3.eth.abi.encodeParameters(['string'], [typeString.slice(2)]), 'hex');
    const encodedData = eip712.encodeMessageData(message, types, types[primaryType], debug);
    const hashedStruct = web3.utils.sha3(`${typeHash}${encodedData.slice(2)}`, 'hex');

    return hashedStruct;
}

eip712.encodeStruct = function encodeStruct(primaryType, types, debug = false) {
    const typeKeys = [primaryType, ...Object.keys(types).filter(key => key !== primaryType).sort((a, b) => a.localeCompare(b))];
    return typeKeys.reduce((acc, typeKey) =>
        `${acc}${typeKey}(${types[typeKey].reduce((accc, { name, type }) => `${accc}${name} ${type},`, '').slice(0, -1)})`, '');
}


eip712.encodeMessageData = function encodeMessageData(message, types, topLevel = {}, debug = false) {
    
    function recurse(_message, _topLevel = {}) {
        const messageKeys = Object.keys(_message);
        const topLevelTypes = _topLevel.reduce((acc, { name, type }) => ({ ...acc, [name]: { name, type } }), {});
        return messageKeys.reduce((acc, messageKey) => {
            const { type } = topLevelTypes[messageKey];
            if (types[type]) {
                const newMessage = _message[messageKey];
                return `${acc}${recurse(newMessage, types[type])}`;
            } else if (type === 'string' || type === 'bytes' || type.includes('[')) {
                const data = web3.eth.abi.encodeParameters([type], [_message[messageKey]]);
                const hash = web3.utils.sha3(data, 'hex');
                return `${acc}${hash.slice(2)}`;
            } else {
                return `${acc}${web3.eth.abi.encodeParameters([type], [_message[messageKey]]).slice(2)}`;
            }
        }, '');
    }
    const result = `0x${recurse(message, topLevel)}`;
    // console.log('encoded data = ', result);
    return result;

}

module.exports = eip712;