# PodWatch

Quickly and easily monitor errors within a Kubernetes cluster. PodWatch provides a simple and easy way to stream all errors coming from your cluster into the PodWatch Web Service or to a custom server developed by you. You can generate notifications, trigger webhooks, and view all your errors in one convenient place.

## Getting started

### Prerequisites

- A running Kubernetes cluster
- Administrative access to apply new roles, role bindings, service accounts and deployments to the cluster

### Setup

First, head to the PodWatch website and create an account. Add a new cluster to your account, and get your cluster ID and secret. (If you do not wish to use the PodWatch Web Service, you should review the [Custom Server](#custom-server) instructions before creating the following configurations.)

Next, create the Kubernetes YAML config files for PodWatch. You will need a Deployment, ServiceAccount, ClusterRole, ClusterRoleBinding, ConfigMap, and Secret. Provided below are some examples that can be copied and added into your cluster. Once you create these files, you can simply add them to your cluster with `kubectl apply -f podwatch`, where `podwatch` is a directory containing all six config files (alternatively you can apply them one-at-a-time if you choose).

#### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: podwatch
spec:
  replicas: 1
  selector:
    matchLabels:
      app: podwatch
  template:
    metadata:
      labels:
        app: podwatch
    spec:
      containers:
        - name: podwatch
          image: wvaviator/podwatch:latest
          envFrom:
            - configMapRef:
                name: podwatch-config
            - secretRef:
                name: podwatch-secrets
                optional: true
      serviceAccountName: podwatch-serviceaccount
```

#### ServiceAccount

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: podwatch-serviceaccount
```

#### ClusterRole

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  namespace: default
  name: podwatch-role
rules:
  - apiGroups: ['']
    resources: ['events']
    verbs: ['get', 'watch', 'list']
```

#### ClusterRoleBinding

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: podwatch-role-binding
  namespace: default
subjects:
  - kind: ServiceAccount
    name: podwatch-serviceaccount
    namespace: default
roleRef:
  kind: ClusterRole
  name: podwatch-role
  apiGroup: rbac.authorization.k8s.io
```

#### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: podwatch-config
data:
  # The client ID is obtained from the Podwatch web service when you register a new cluster.
  PODWATCH_CLIENT_ID: your-client-id

  # Uncomment and set the following environment variable if you are using a custom Podwatch server.
  # Make sure to exclude the client ID in this config map and exclude the client secret in the deployment.
  # PODWATCH_CUSTOM_SERVER_URL: your-custom-server-url

  # The remaining variables are set by default and can be excluded. They are included here for reference or for further customization.

  # The maximum number of subsequent error events reported by the cluster before the events are dispatched.
  # MAX_DISPATCH_QUEUE_SIZE: '20'

  # The amount of time to wait before dispatching a partial queue of error events.
  # DISPATCH_IDLE_TIMEOUT: '1000'

  # The amount of time to wait before a dispatch request times out.
  # WEBHOOK_INSTANCE_TIMEOUT: '10000'

  # How often to send a heartbeat with status and log information to the Podwatch service or customer server.
  # Do not set unless you are using a custom Podwatch server with a '/status' endpoint to receive heartbeats.
  # Setting to 0 will disable heartbeats.
  # HEARTBEAT_INTERVAL: '30000'
```

#### Secret

Always ensure your secret is stored in a secure location.
You may choose to include the secret from the command line, with the following command:

```bash
kubectl create secret generic podwatch-secrets --from-literal=PODWATCH_CLIENT_SECRET='your-client-secret'
```

Or you may include it in a configuration file. To do this, you must first base64 encode the secret with the following command:

```bash
echo -n 'your-client-secret' | base64
```

And then include it in the YAML file.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: podwatch-secrets
type: Opaque
data:
  PODWATCH_CLIENT_SECRET: your-base64-encoded-secret
```

### Custom Server

Optionally, if you prefer not to use the PodWatch Web Service, you can still set up your own custom server with a webhook that will be called by PodWatch upon receiving errors from the cluster. Within this custom server, you can set up custom actions, messages, notifications, or any other custom responses to cluster errors.

To set up a custom server, modify the ConfigMap by commenting out or deleting the PODWATCH_CLIENT_ID and adding a PODWATCH_CUSTOMER_SERVER_URL variable. You will still need to create a Deployment, ServiceAccount, ClusterRole, and ClusterRoleBinding as in the provided examples above.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: podwatch-config
data:
  PODWATCH_CUSTOM_SERVER_URL: your-custom-server-url

  # The remaining variables are set by default and can be excluded. They are included here for reference or for further customization.

  # The maximum number of subsequent error events reported by the cluster before the events are dispatched.
  # MAX_DISPATCH_QUEUE_SIZE: '20'

  # The amount of time to wait before dispatching a partial queue of error events.
  # DISPATCH_IDLE_TIMEOUT: '1000'

  # The amount of time to wait before a dispatch request times out.
  # WEBHOOK_INSTANCE_TIMEOUT: '10000'

  # How often to send a heartbeat with status and log information to the Podwatch service or customer server.
  # Do not set unless you are using a custom Podwatch server with a '/status' endpoint to receive heartbeats.
  # Setting to 0 will disable heartbeats.
  # HEARTBEAT_INTERVAL: '30000'
```

The PODWATCH_CUSTOM_SERVER_URL should be a URL that can be suffixed with two endpoints, `/watch` and `/status` to receive errors and status updates from PodWatch. The `/watch` enpoint will be called by PodWatch with a POST request, with a request body that will be an array of the following objects:

```json
{
  "name": "podwatch-984hv9w8hf-384hf.c3niwfjr8h34f",
  "reason": "FailedKillPod",
  "message": "error killing pod: failed to \"KillContainer\" for \"podwatch\" with KillContainerError: \"rpc error: code = Unknown desc = Error response from daemon: No such container\"",
  "type": "Warning",
  "firstTimestamp": "2023-03-03T17:28:02Z",
  "lastTimestamp": "2023-03-03T17:28:02Z",
  "count": 1,
  "nativeEvent": { "type": "DELETED", "object": { ... } }
}
```

The `nativeEvent` property represents the original event generated by Kubernetes. Use this if you need to access specific information about the resource that caused the error, metadata about the error or associated containers, and other specific information not included in the top-level summary fields.

The `/status` endpoint will be called periodically by the Podwatch service with a message containing the following body:

```json
{
  "status": "OK",
  "timestamp": "2023-03-03T17:28:02Z",
  "logs": [
    {
      "message": "17 error events dispatched",
      "args": [],
      "level": "info",
      "timestamp": "2023-03-03T17:27:42Z"
    }
  ]
}
```

If you do not want to use the `/status` endpoint, you can set the `HEARTBEAT_INTERVAL` variable to 0 in the ConfigMap.
