module.exports.headingDifference = (headingA, headingB) => {
  let res = headingA - headingB;
  res = ((res + 180) % 360) - 180;
  return res;
};

module.exports.distance = (distanceA, distanceB) => (distanceA[0] - distanceB[0])
  * (distanceA[0] - distanceB[0]) + (distanceA[1] - distanceB[1])
  * (distanceA[1] - distanceB[1]) + (distanceA[2] - distanceB[2])
  * (distanceA[2] - distanceB[2]);
