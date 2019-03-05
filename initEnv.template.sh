#!/bin/bash
# usage: . ./initEnv.sh
export LO_MQTT_ENDPOINT=mqtt://liveobjects.orange-business.com:1883
export LO_MQTT_API_KEY=my_mqtt_api_key_value_here
# export LO_API_HOST=liveobjects.orange-business.com
# export LO_API_ENDPOINT=https://liveobjects.orange-business.com/api

# LO_VERBOSE: set to true to see raw messages
export LO_VERBOSE=false

# LO_INSECURE: set to true to disable ssl cert chain validation (reserved to LiveObject Team - self-signed certificates)
# export LO_INSECURE=false