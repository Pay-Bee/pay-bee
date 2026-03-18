import NodeCache from "node-cache";

// TTL: 10 minutes per game entry
const catalogCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

export default catalogCache;
