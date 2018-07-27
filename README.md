# Live Objects MQTT Client

This project includes Live Objects Client code samples for the MQTT protocol, written in JavaScript for node.js

## Quick start

### Download

Clone this repository from GitHub:

```
$ git clone https://github.com/Orange-OpenSource/LiveObjects-samples-nodejs.git
```

### Prerequisites

1. Install NodeJs (https://nodejs.org/en/download/)
2. Install samples dependencies (from package.json, example, https://github.com/mqttjs/MQTT.js)
    > npm install


### Sample LoRa mqtt client

In order to retrieve data, a valid LoRa device must be provisioned on your account. You should have a valid API-KEY with at least BUS_R role.

Open the mqtt-client.js

1. Replace the apiKey with yours
2. Configure your mqttTopic depending on your needs, subscriptions for all devices PubSub, one specific device PubSub or FIFO
3. Run the mqtt-client.js:
    > node mqtt-client.js


### Sample Mqtt DeviceMode client

1. Run the mqtt-deviceMode.js:
    > node mqtt-deviceMode.js mqtt://liveobjects.orange-business.com:1883 YourApiKeyValueHere SampleLODemo
2. type 'h' to see device help menu or 'q' to disconnect.


## License

Copyright (c) 2015 — 2018 Orange

This code is released under the BSD3 license. See the `LICENSE` file for more information.

## Contact

* Homepage: [liveobjects.orange-business.com](https://liveobjects.orange-business.com/)
