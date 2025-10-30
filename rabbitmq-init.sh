#!/bin/bash
# RabbitMQ initialization script
# Beállítja az szükséges queue-kat és exchange-eket

# Várj, amíg a RabbitMQ elindult
sleep 10

# Exchange-ek
rabbitmqctl declare_exchange topic ml.exchange -p /

# Queue-k
rabbitmqctl declare_queue ticket.processing -p /
rabbitmqctl declare_queue ml.inference -p /
rabbitmqctl declare_queue batch.processing -p /
rabbitmqctl declare_queue ticket.completed -p /
rabbitmqctl declare_queue ml.completed -p /

# Dead Letter Queue
rabbitmqctl declare_queue dl.ticket.processing -p /
rabbitmqctl declare_queue dl.ml.inference -p /

# Binding-ek
rabbitmqctl bind_queue ticket.processing ml.exchange "ticket.*" -p /
rabbitmqctl bind_queue ml.inference ml.exchange "ml.*" -p /
rabbitmqctl bind_queue batch.processing ml.exchange "batch.*" -p /

# User permissions
rabbitmqctl set_permissions -p / guest ".*" ".*" ".*"

echo "RabbitMQ initialization complete!"
