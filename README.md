# Model Inference Auto Scaling Reinforcement Learning

This repository is source code for my thesis about auto scaling reinforcement learning. But this is the application that is used for the experiments (inference).

## Helm Command

```bash
helm install prometheus prometheus-community/kube-prometheus-stack \
--namespace monitoring \
--set prometheus.prometheusSpec.podMonitorSelectorNilUsesHelmValues=false \
--set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
--set kubeControllerManager.enabled=false \
--set kubeScheduler.enabled=false \
--set kubeEtcd.enabled=false \
--set kubeProxy.enabled=false \
--set grafana.enabled=false
--set alertmanager.enabled=false
```

```bash
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --set controller.metrics.enabled=true \
  --set-string controller.podAnnotations."prometheus\.io/scrape"="true" \
  --set-string controller.podAnnotations."prometheus\.io/port"="10254" \
  --set-string controller.podAnnotations."prometheus\.io/path"="/metrics" \
  --set controller.metrics.serviceMonitor.enabled=true \
  --set controller.metrics.serviceMonitor.additionalLabels.release="prometheus" \
  --set controller.metrics.serviceMonitor.namespace="ingress-nginx" \
  --set controller.metrics.serviceMonitor.additionalLabels.prometheus="kube-prometheus-stack" \
  --set controller.metrics.serviceMonitor.additionalLabels.app="kube-prometheus-stack"
```

## Kubectl Command

```bash
kubectl port-forward --address 0.0.0.0 -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
```
