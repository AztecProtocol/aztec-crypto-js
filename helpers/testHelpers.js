
const addOrderToAllOrders = (
    orderAddresses, orderValues,
    makerSignatureR, makerSignatureS, makerSignatureV,
    takerSignatureR, takerSignatureS, takerSignatureV,
    fillingExistingPartial, orderHash,
    existingOrders = {
        allOrderAddresses: [],
        allOrderValues: [],
        allMakerSignatureR: [],
        allMakerSignatureS: [],
        allMakerSignatureV: [],
        allTakerSignatureR: [],
        allTakerSignatureS: [],
        allTakerSignatureV: [],
        allFillingExistingPartial: [],
        allOrderHash: [],
    }
) => {
    existingOrders.allOrderAddresses.push(orderAddresses);
    existingOrders.allOrderValues.push(orderValues);
    existingOrders.allMakerSignatureR.push(makerSignatureR);
    existingOrders.allMakerSignatureS.push(makerSignatureS);
    existingOrders.allMakerSignatureV.push(makerSignatureV);
    existingOrders.allTakerSignatureR.push(takerSignatureR);
    existingOrders.allTakerSignatureS.push(takerSignatureS);
    existingOrders.allTakerSignatureV.push(takerSignatureV);
    existingOrders.allFillingExistingPartial.push(fillingExistingPartial);
    existingOrders.allOrderHash.push(orderHash);
    return existingOrders;
};

const transpose = m => m[0].map((x,i) => m.map(x => x[i]))


module.exports = {
    addOrderToAllOrders,
    transpose,
};
