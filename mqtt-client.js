/*
 * Copyright (C) 2016 Orange
 *
 * This software is distributed under the terms and conditions of the 'BSD-3-Clause'
 * license which can be found in the file 'LICENSE.txt' in this package distribution
 * or at 'https://opensource.org/licenses/BSD-3-Clause'.
 */

var mqtt = require('mqtt')
const url = "mqtt://liveobjects.orange-business.com:1883"
const apiKey = "YourApiKey"

/** Subscription for one specific device (pub sub) (deprecated and will be decommissioned in december 2018) **/
// const mqttTopic = "router/~event/v1/data/new/urn/lora/0123456789ABCDEF/#"

/** Subscription for all devices (pub sub) (deprecated and will be decommissioned in december 2018) **/
// const mqttTopic = "router/~event/v1/data/new/urn/lora/#"

/** Subscription for one specific device (pub sub) (new) **/
// const mqttTopic = "router/~event/v1/data/new/typ/+/dev/urn:lo:nsid:lora:0123456789ABCDEF/con/lora/evt/+/grp/#"

/** Subscription for all devices (pub sub) (new) **/
// const mqttTopic = "router/~event/v1/data/new/typ/+/dev/+/con/lora/evt/+/grp/#"

/** Subscription for a fifo (persisted) **/
const mqttTopic = "fifo/default"

var client;

function onLoraMessage(loraMessage) {

      console.log("DevEUI:", loraMessage.metadata.source.split(':')[2]); //use this if you are using one of the deprecated topics
	  //console.log("DevEUI:", loraMessage.metadata.source.split(':')[4]); //use this if you are using one of the new topics
      console.log("Timestamp:", loraMessage.timestamp);
      console.log("Port:", loraMessage.metadata.network.lora.port);
      console.log("Fcnt:", loraMessage.metadata.network.lora.fcnt);
      console.log("Payload:", loraMessage.value.payload, "\n");

}

function onMessage(topic, message) {

      console.log("MQTT::New message\n");
      var jsonMessage = JSON.parse(message)

      if (jsonMessage.metadata == null
       || jsonMessage.metadata.source == null
       || jsonMessage.metadata.network.lora == null) {
        console.log(jsonMessage);
        return;
      }

      onLoraMessage(jsonMessage);

}

function clientConnect() {
    /** connect **/
    console.log("MQTT::Connecting to", url);
    client  = mqtt.connect(url, {username:"payload", password:apiKey, keepAlive:30})

    /** client on connect **/
    client.on("connect", function() {
      console.log("MQTT::Connected");

      client.subscribe(mqttTopic)
      console.log("MQTT::Subscribed to topic:", mqttTopic);
    })

    /** client on error **/
    client.on("error", function(err) {
      console.log("MQTT::Error from client --> ", err);
    })

    client.on("message", function (topic, message) {
        onMessage(topic, message);
    });
}

console.log("CTRL + C to quit");
clientConnect();