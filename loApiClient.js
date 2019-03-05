// logging
const log4js = require('log4js');
const logger = log4js.getLogger();

// rest call
const https = require('https');
const URL = require("url");

const UNAUTHORIZED_ERROR = "Unauthorized api key";

class LoApiClient {
  /**
    * check if a given API ENDPOINT url is valid or not
    */
  static validLiveObjectsApiEndpoint(url) {
    return /^(http[s]?):\/\/(.*)$/.test(url);
  }

  constructor(apiEndpoint, apiKeyValue) {
    if (!LoApiClient.validLiveObjectsApiEndpoint(apiEndpoint)) {
      throw new Exception("invalid LO API ENDPOINT");
    }
    this.endpoint = apiEndpoint;
    this.apiKey = apiKeyValue;
  }

  getBaseOptions(apiPath) {
    var options = URL.parse(this.endpoint + apiPath);
    options.headers = {'X-IAE-KEY' : this.apiKey};
    return options;
  }

  extractBufferData(bufferMessage) {
    return Buffer.from(JSON.parse(JSON.stringify(bufferMessage)).data).toString('utf8');
  }

  getCurrentApiKey(cbSuccess, cbError) {
    var loApi = this;
    var options = this.getBaseOptions("/v0/apiKeys/current_key");

    logger.debug("showApiKey: ", options);
    var reqGet = https.get(options, function(res) {
      var success = (res.statusCode >= 200 && res.statusCode < 300);
      res.on('data', function(bufferMessage) {
        var dataString = loApi.extractBufferData(bufferMessage);
        if (success) {
          cbSuccess(dataString);
        } else {
          logger.debug("statusCode: ", res.statusCode);
          if (res.statusCode == 401) {
            cbError(UNAUTHORIZED_ERROR);
          } else {
            cbError(dataString);
          }
        }
      });
    });
    reqGet.on('error', function(e) {
      logger.error(e);
      cbError(e);
    });
    reqGet.end();
  };

  putApiKeyDebugMode(apiKeyId, debugDurationSecond, cbSuccess, cbError) {
    var loApi = this;
    var apiPath = '/v0/apiKeys/' + apiKeyId + '/debugMode';
    var options = this.getBaseOptions(apiPath);
    options.headers['Content-type']= 'application/json';
    options.method = 'PUT';
    var putBody = JSON.stringify({"activated":true,"durationSeconds":debugDurationSecond});
    logger.debug("putApiKeyDebugMode: options:", options, "body:",putBody);
    var reqPut = https.request(options, function(res) {
      var success = (res.statusCode >= 200 && res.statusCode < 300);
      // logger.debug("statusCode: ", res.statusCode);
      // logger.debug("headers: ", res.headers);
      res.on('data', function(bufferMessage) {
        var dataString = loApi.extractBufferData(bufferMessage);
        if (success) {
          cbSuccess(dataString);
        } else {
          logger.debug("statusCode: ", res.statusCode);
          if (res.statusCode == 401) {
            cbError(UNAUTHORIZED_ERROR);
          } else {
            cbError(dataString);
          }
        }
      });
    });
    reqPut.on('error', function(e) {
      logger.error(e);
      cbError(e);
    });
    reqPut.write(putBody);
    reqPut.end();
  };


};

module.exports = LoApiClient;

