#!/usr/bin/env bash
#Author: anli@redhat.com
#Description: Validate logs appears until timeout. the script will search tenant applicaiton, infrastructure and audit if tenanet is not specified.
# 
set -x
QUERY=${1:-'{log_type="application"}'}
QUERY=${QUERY//[[:space:]]/} #remove all spaces
TIMEOUT=${2:-120}   # seconds

URL=$(oc get route logging-loki  -n openshift-logging -o jsonpath='{.spec.host}')
TOKEN=$(oc whoami -t)
WINDOW="300"     # seconds
STEP="30s"
INTERVAL="10"

start_time=$(date +%s)
echo "Waiting until logs appear..."

function queryLogsInTenant()
{
  tenant=${1:-application}
  result=$(curl -s -G -k -H "Authorization: Bearer ${TOKEN}" -H "X-Scope-OrgID:${tenant}" https://${URL}/api/logs/v1/${tenant}/loki/api/v1/query_range \
    --data-urlencode "query=count_over_time(${QUERY} [${WINDOW}s])" | jq '.data.result|length')

  if [ "$result" -gt 0 ]; then
    echo "Logs appeared ($result)"
    exit 0
  fi
}
############## Main #################
start_time=$(date +%s)
while true; do
  now=$(date +%s)
  ##exit 0, if one return true
  tenant=""

  if [[ $QUERY =~ log_type=\"application\" ]]; then
     echo "query tenant application"
     tenant="application"
     queryLogsInTenant ${tenant}
  fi

  if [[ $QUERY =~ log_type=\"infrastructure\" ]] || [[ $QUERY =~ namespace=\"default\" ]] || [[ $QUERY =~ namespace=\"openshift\" ]] || [[ $QUERY =~ namespace=\"kube- ]] || [[ $QUERY =~ namespaceu=\"openshift- ]] ;   then
     echo "query tenant infrastructure"
     tenant="infrastructure"
     queryLogsInTenant ${tenant}
  fi

  if [[ $QUERY =~ log_type=\"audit\" ]]; then
     echo "query tenant audit"
     tenant="audit"
     queryLogsInTenant ${tenant}
  fi

  if [[ $tenant == "" ]]; then
     echo "query all tenants"
     queryLogsInTenant "application"
     queryLogsInTenant "infrastructure"
     queryLogsInTenant "audit"
  fi

  if [ $((now-start_time)) -ge "$TIMEOUT" ]; then
    echo "Timeout waiting for logs"
    exit 1
  fi

  sleep "$INTERVAL"
done
