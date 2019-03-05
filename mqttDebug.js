/**
	Live Object mqtt debug mode application (using bridge mode) :
		- notifies of mqtt debug message
		- require apiKey with debug mode enabled (cf. https://liveobjects.orange-business.com/#/faq
**/
const mqtt = require("mqtt");
const os = require("os");
const readline = require('readline');


// logging
const log4js = require('log4js');
const logger = log4js.getLogger();

const LoApiClient = require('./loApiClient.js');

const TWO_HOURS_IN_SECONDS = 2*60*60;

logger.setLevel('info');

function validMqttUrl(url) {
 return /^(mqtt[s]?):\/\/(.*)\:[0-9]{4}$/.test(url);
}

var serverURL = "mqtt://liveobjects.orange-business.com:1883";
if (validMqttUrl(process.env.LO_MQTT_ENDPOINT)) {
  serverURL = process.env.LO_MQTT_ENDPOINT;
}

var apiEndpoint = "https://liveobjects.orange-business.com/api";
if (LoApiClient.validLiveObjectsApiEndpoint(process.env.LO_API_ENDPOINT)) {
  apiEndpoint = process.env.LO_API_ENDPOINT;
}

var apiKey = process.env.LO_MQTT_API_KEY;
var apiKeyIdCache = null;

var loVerbose = process.env.LO_VERBOSE;
if (loVerbose== 'true') {
  logger.setLevel('debug');
  console.log("verbose log level enabled.");
}

var loInsecure = process.env.LO_INSECURE;
if (loInsecure== 'true') {
  console.log("WARN insecure mode enabled : this mode doesn't prevent man in the middle attack.");
  // remove invalid certificate chain reject
  // to use only with self-signed certificates
  // this is a known security issue
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
}

// reading arguments
if (apiKey == '' || !validMqttUrl(serverURL)) {
	console.log("Live Object Mqtt Debug Mode application: ");
	console.log("");
	console.log("requirements");
	console.log("   export LO_MQTT_API_KEY=<apiKey>     LiveObjects API keys *required*");
	console.log("options");
	console.log("   export LO_MQTT_ENDPOINT=<serverURL>  (default: mqtt://liveobjects.orange-business.com:1883)");
	console.log("   export LO_VERBOSE=true               (default: false)");
	console.log("   export LO_API_HOST=<apiHost>         (default: liveobjects.orange-business.com)");
	console.log("");
	console.log("usage: node mqttDebug.js");
	return;
}

var deviceNamespace = "NodeJS";
var deviceId = "mqttDebug-application";
var deviceUrn = "urn:lo:nsid:"+deviceNamespace+":"+deviceId;
var clientUsername = "json+bridge"; // BridgeMode
var mqttDebugTopic = "router/~event/v1/log/new/mqtt";
var assetConnected = "router/~event/v2/assets/" + deviceNamespace + "/" + deviceId + "/connected";
var assetsEvents = "router/~event/v2/assets/*/*/*";
var eventProcessingEvents = "router/~event/v1/data/eventprocessing/*";

let loApiClient = new LoApiClient(apiEndpoint, apiKey);

var client = mqtt.connect(serverURL, {
	username: clientUsername,
	password: apiKey,
	protocolId: 'MQIsdp',
	protocolVersion: 3,
	clientId: deviceId
});

/*
 * Connection handling
 */
client.on('connect', function(){
	logger.info("connected > publish onto " + assetConnected);
	// connected
	var msgConnect = {
		source: [
			{
				order: 0,
				namespace: deviceNamespace,
				id: deviceId
			}
		],
		asset: {
		}
	};
	client.publish(assetConnected, JSON.stringify(msgConnect));
    logger.info("listening assets events > "  + assetsEvents);
	client.subscribe(assetsEvents);
    logger.info("listening event processing events > "  + eventProcessingEvents);
	client.subscribe(eventProcessingEvents);
    logger.info("listening mqtt debug mode events > "  + mqttDebugTopic);
	client.subscribe(mqttDebugTopic);

    logger.info("type 'h' to see help");
});

/*
 * Message handling
 */
client.onConnectedMessage = function(source0, asset) {
    var assetProperties = Object.getOwnPropertyNames(asset);
    var logInfo = " * " + source0.namespace + ":"+ source0.id + " connected";
    if (assetProperties.length > 0) {
        logInfo += " with " + assetProperties;
    }
    logger.info(logInfo);
};

client.onDisconnectedMessage = function(source0) {
    logger.info(" * " + source0.namespace + ":"+ source0.id + " disconnected");
};

client.onCurrentParamsMessage = function(source0, params) {
    logger.info(" * " + source0.namespace + ":"+ source0.id + " current params : " + JSON.stringify(params));
};

client.extractFromBuffer = function(bufferMessage) {
    var debugMessage = Buffer.from(JSON.parse(JSON.stringify(bufferMessage)).data).toString('utf8');
    // \' produce JSON parse exception, possible issue on LiveObject side (mqtt debug mode message emitter)
    // replace \' => '
    var escapedDebugMessage = debugMessage.replace(/\\\'/g, "'");
    var debugPayload = JSON.parse(escapedDebugMessage).payload;
    return debugPayload;
};

client.on('message', function (topic, message) {
    if (topic == mqttDebugTopic) {
        var debugPayload = client.extractFromBuffer(message);
        logger.info("<["+topic+"] ", debugPayload );
        return;
    }
    var message = JSON.parse(message);
    var jsonMsg = JSON.stringify(message);
    logger.debug("<["+topic+"] ", jsonMsg);
    if (topic.startsWith("router/~event/v2/assets/")) {
        if (topic.endsWith("/connected")) {
            client.onConnectedMessage(message.source[0], message.asset);
        } else if (topic.endsWith("/disconnected")) {
            client.onDisconnectedMessage(message.source[0]);
        } else if (topic.endsWith("/currentParams")) {
            client.onCurrentParamsMessage(message.source[0], message.asset.param);
        }
    }
});

client.on('suback', function (topic, message) {
	logger.info("subscribed to "+topic);
});

client.on('error', function (error) {
	logger.error("error: ", arguments);
});

client.on('close', function () {
	logger.info("connection closed", arguments);
});

client.on('offline', function () {
	logger.info("offline", arguments);
});

client.on('reconnect', function () {
	logger.info("reconnect", arguments);
});

client.bye = function() {
    console.log("bye");
    client.end();
    process.exit();
};

client.menu = function() {
  console.log("  * ~~help menu~~");
  console.log("    ~ mqtt");
  console.log("    h  display help menu");
  console.log("    q or <CTRL> + <c>  quit");
  console.log("")
  console.log("    ~ LiveObjects ReST API");
  console.log("    k show current api key full details");
  console.log("    d enable api key debug mode for the next two hours");
};

client.showApiKey = function() {
  logger.debug("  * show api key details");
  loApiClient.getCurrentApiKey(
      (apiKeyDetails) => {
        logger.debug('api key details:\n',apiKeyDetails);
        var apiKey= JSON.parse(apiKeyDetails);
        apiKeyIdCache = apiKey.id;
        if (apiKey.debugModeEndTs == 0) {
          logger.info("api key debug mode DISABLED");
        } else if (apiKey.debugModeEndTs > 0) {
          var now = new Date().getTime();
          var debugEnd = new Date(apiKey.debugModeEndTs);
          // logger.debug("now is", new Date().toLocaleString(), "debug end is",debugEnd.toLocaleString());
          logger.info((apiKey.debugModeEndTs < now) ? 'api key debug is disabled, end was'
                                                    : 'api key debug is enabled until',
                       debugEnd.toLocaleString());
        }
      },
      (error) => {
        logger.warn(error);
      }
    );
};

client.assumeApiKeyIdCache = function(cb) {
  if (apiKeyIdCache != null) {
    cb();
    return;
  }
  loApiClient.getCurrentApiKey(
      (apiKeyDetails) => {
        var apiKey= JSON.parse(apiKeyDetails);
        apiKeyIdCache = apiKey.id;
        cb();
      },
      (error) => {
        logger.warn(error);
      }
  );
};

client.setApiKeyDebugMode = function() {
  client.assumeApiKeyIdCache(() => {
    logger.debug("  * set api key (#" + apiKeyIdCache + ") debug mode for next 2 hours");
    loApiClient.putApiKeyDebugMode(apiKeyIdCache, TWO_HOURS_IN_SECONDS,
      () => {
        logger.info("done");
      },
      (error) => {
        logger.warn(error);
      }
    );
  });
};

client.onKeyPressed = function(str, key) {
  if ((key.name == 'q')
   || (key && key.ctrl && key.name == 'c')) {
    client.bye();
    return;
  }
  switch (key.name) { // input menu key dispatcher
    case 'h': client.menu(); break;
    case 'k': client.showApiKey(); break;
    case 'd': client.setApiKeyDebugMode(); break;
    case 'return': break; // ignore
    default : console.log('unknown command "' + str + '" (ctrl:' + key.ctrl + ' name:' + key.name + ')');
  }
};

// Key input
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.on('keypress', (str, key) => { client.onKeyPressed(str, key) });