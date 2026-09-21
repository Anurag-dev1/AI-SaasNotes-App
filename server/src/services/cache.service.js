const { cacheClient } = require('../config/redis');
const env = require('../config/env');
const logger = require('../config/logger');

exports.getNote = async (tenantId, noteId) => {
  try {
    const key = `tenant:${tenantId}:note:${noteId}`;
    const data = await cacheClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.error(`Cache getNote error: ${err.message}`);
    return null;
  }
};

exports.setNote = async (tenantId, noteId, data) => {
  try {
    const key = `tenant:${tenantId}:note:${noteId}`;
    await cacheClient.setex(key, env.REDIS_CACHE_TTL_SECONDS, JSON.stringify(data));
  } catch (err) {
    logger.error(`Cache setNote error: ${err.message}`);
  }
};

exports.invalidateNote = async (tenantId, noteId) => {
  try {
    const key = `tenant:${tenantId}:note:${noteId}`;
    await cacheClient.del(key);
  } catch (err) {
    logger.error(`Cache invalidateNote error: ${err.message}`);
  }
};

const getVersionKey = (tenantId) => `tenant:${tenantId}:notes:version`;

const getListVersion = async (tenantId) => {
  let version = await cacheClient.get(getVersionKey(tenantId));
  if (!version) {
    version = '1';
    await cacheClient.set(getVersionKey(tenantId), version);
  }
  return version;
};

exports.invalidateNoteList = async (tenantId) => {
  try {
    await cacheClient.incr(getVersionKey(tenantId));
  } catch (err) {
    logger.error(`Cache invalidateNoteList error: ${err.message}`);
  }
};

exports.getNoteList = async (tenantId, queryHash) => {
  try {
    const version = await getListVersion(tenantId);
    const key = `tenant:${tenantId}:notes:v${version}:${queryHash}`;
    const data = await cacheClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.error(`Cache getNoteList error: ${err.message}`);
    return null;
  }
};

exports.setNoteList = async (tenantId, queryHash, data) => {
  try {
    const version = await getListVersion(tenantId);
    const key = `tenant:${tenantId}:notes:v${version}:${queryHash}`;
    await cacheClient.setex(key, env.REDIS_CACHE_TTL_SECONDS, JSON.stringify(data));
  } catch (err) {
    logger.error(`Cache setNoteList error: ${err.message}`);
  }
};

exports.getOrSet = async (key, ttlSeconds, fetchFn) => {
  try {
    const cached = await cacheClient.get(key);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    logger.error(`Cache getOrSet read error: ${err.message}`);
  }

  const freshData = await fetchFn();

  try {
    await cacheClient.setex(key, ttlSeconds, JSON.stringify(freshData));
  } catch (err) {
    logger.error(`Cache getOrSet write error: ${err.message}`);
  }

  return freshData;
};
