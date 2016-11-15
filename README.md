# Live Objects MQTT Client

mqtt-client.js is a code sample for the MQTT protocol, written in JavaScript for node.js

## Quick start

### Download

Clone from GitHub:

```
$ git clone https://github.com/Orange-OpenSource/LiveObjects-samples-nodejs.git
```

### Prerequisites

1. Install NodeJs (https://nodejs.org/en/download/)
2. Install MQTTJs (https://github.com/mqttjs/MQTT.js)
    > npm install mqtt

3. In order to retrieve data, a valide LoRa device must be provisionned on your account. You should have a valid API-KEY with at least LPWA_USER role.

### Getting Started
Open the mqtt-client.js

1. Replace the apiKey with yours
2. Configure your mqttTopic depending on your needs, subscriptions for all devices PubSub, one specific device PubSub or FIFO
3. Run the mqtt-client.js:
    > node mqtt-client.js

## License

Copyright (c) 2015 — 2016 Orange

This code is released under the BSD3 license. See the `LICENSE` file for more information.

## Contact

* Homepage: [lpwa.liveobjects.orange-business.com](https://lpwa.liveobjects.orange-business.com/)
