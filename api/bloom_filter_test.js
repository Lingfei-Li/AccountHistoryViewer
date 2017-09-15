


const BloomFilter = require('bloom-filter');


const numberOfElements = 20;
const falsePositiveRate = 0.001;

const filter = BloomFilter.create(numberOfElements, falsePositiveRate);

console.log(JSON.stringify(filter.toObject()));

filter.insert("c3f75270-8e17-11e7-be9b-fcaa14c00298");
filter.insert("e450adc6-8e15-11e7-b7c8-fcaa14c00298");
filter.insert("8320155c-8e18-11e7-803d-fcaa14c00298");

console.log(JSON.stringify(filter.toObject()));
console.log(filter.contains("c3f75270-8e17-11e7-be9b-fcaa14c00298"));
console.log(filter.contains("e450adc6-8e15-11e7-b7c8-fcaa14c00298"));
console.log(filter.contains("8320155c-8e18-11e7-803d-fcaa14c00298"));
console.log(filter.contains("8320155c-8e18-11e7-803d-fcaa14c00297"));
