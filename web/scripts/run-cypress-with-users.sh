#!/usr/bin/env bash
set +x
# Author: anli@redhat.com
# Description: Run Logging UI test using the given users. The script will create htpasswd IPD and create five users uiauto-test-1..5 if Environement CYPRESS_LOGIN_IDP and CYPRESS_LOGIN_USERS are not defined. 
#   you can specify the test cases in Environment TEST_TO_RUN. When TEST_TO_RUN is null, all cases will be executed.  speicfy the spec TEST_TO_RUN="--spec xxx", specify the tags TEST_TO_RUN="--tag xxx"
#   prerequisite: Appplication, infrastructure and audit logs are sent to lokistack, two basic projects log-test-app1,log-test-app2 are deployed, the lokistack name is logging-loki under openshift-logging namespace

## Exit if the server can not be found
oc whoami --show-server || exit 1

## Add test users for authorization test
set +x
uitest_users=""
htpass_file="/tmp/uihtpasswd"

function enable_idp_htpasswd()
{
    echo "## Create htpasswd IDP users"
    for i in $(seq 1 5); do
        username="uiauto-test-${i}"
        password=$(tr </dev/urandom -dc 'a-z0-9' | fold -w 12 | head -n 1 || true)
        uitest_users+="${username}:${password},"
        if [ -f "${htpass_file}" ]; then
            htpasswd -B -b ${htpass_file} "${username}" "${password}"
        else
            htpasswd -c -B -b ${htpass_file} "${username}" "${password}"
        fi
    done
    # remove trailing ',' for case parsing
    uitest_users=${uitest_users%?}

    # record current generation number
    gen_number=$(oc -n openshift-authentication get deployment oauth-openshift -o jsonpath='{.metadata.generation}')
    echo ${gen_number}

    # add users to cluster
    oc -n openshift-config create secret generic uiauto-htpass-secret  || exit 1
    oc -n openshift-config set data secret/uiauto-htpass-secret --from-file=htpasswd=${htpass_file} -n openshift-config || exit 1
    echo ${uitest_users} >/tmp/uitest_users

    idp_list=$(oc get oauth cluster -o jsonpath='{.spec.identityProviders}')
    if [[ $idp_list == ""  || $idp_list == "{}" ]];then
        oc patch oauth cluster --type='json' -p='[{"op": "add", "path": "/spec/identityProviders", "value": [{"type": "HTPasswd", "name": "uiauto-htpasswd-idp", "mappingMethod": "claim", "htpasswd":{"fileData":{"name": "uiauto-htpass-secret"}}}]}]' || exit 1
    else
        oc patch oauth cluster --type='json' -p='[{"op": "add", "path": "/spec/identityProviders/-", "value": {"type": "HTPasswd", "name": "uiauto-htpasswd-idp", "mappingMethod": "claim", "htpasswd":{"fileData":{"name": "uiauto-htpass-secret"}}}}]' || exit 1
    fi

    echo "wait up to 5 minutes for new idp take effect"
    expected_replicas=$(oc -n openshift-authentication get deployment oauth-openshift -o jsonpath='{.spec.replicas}')
    count=1
    while [[ $count -le 6 ]]; do
	echo "try the ${count} time "
        available_replicas=$(oc -n openshift-authentication get deployment oauth-openshift -o jsonpath='{.status.availableReplicas}')
        new_gen_number=$(oc get -n openshift-authentication deployment oauth-openshift -o jsonpath='{.metadata.generation}')
        if [[ $expected_replicas == "$available_replicas" && $((new_gen_number)) -gt $((gen_number)) ]]; then
            break
        else
            sleep 30s
        fi
	(( count=count+1 ))
    done

    echo "Verify if uiauto-htpasswd-idp works"
    echo "login as the new user"
    origin_kube=${KUBECONFIG}
    echo "cp $origin_kube /tmp/normal_kubeconfig"
    cp $origin_kube /tmp/normal_kubeconfig || exit 1
    first_passwd=${uitest_users#uiauto-test-1:}
    first_passwd=${first_passwd%%,*}

    export KUBECONFIG=/tmp/normal_kubeconfig
    echo "oc login -u uiauto-test-1 -p <first_user_passwd>$"
    oc login  --username=uiauto-test-1 --password=${first_passwd}  || export KUBECONIFG=$origin_kube; exit 1
    echo "Enable IDP uiauto-htpasswd-idp succesfully"
    export KUBECONIFG=$origin_kube
}

function check_clusterlogging(){
    echo "## Verify test data are ready for Logging UI Test"
    echo "Verify there are test pods in log-test-app1 and log-test-app2"
    oc -n log-test-app1 wait pod --for=condition=ready -l test=centos-logtest
    oc -n log-test-app2 wait pod --for=condition=ready -l test=centos-logtest

    echo "Verify logs are collected and stored in lokistack"
    echo "check if the collector and lokistack pod are ready"
    oc -n openshift-logging wait pod --for=condition=ready -l  app.kubernetes.io/component=collector || exit 1
    oc -n openshift-logging wait pod --for=condition=ready -l  app.kubernetes.io/instance=logging-loki || exit 1

    lokistack_route=$(oc -n openshift-logging get route logging-loki -n openshift-logging -o json |jq '.spec.host' -r)
    oc -n openshift-logging create sa lokistack-query >/dev/null 2>&1
    oc adm policy add-cluster-role-to-user cluster-admin system:serviceaccount:openshift-logging:lokistack-query
    oc adm policy add-cluster-role-to-user cluster-logging-application-view system:serviceaccount:openshift-logging:lokistack-query
    oc adm policy add-cluster-role-to-user cluster-logging-audit-view system:serviceaccount:openshift-logging:lokistack-query
    oc adm policy add-cluster-role-to-user cluster-logging-infrastructure-view system:serviceaccount:openshift-logging:lokistack-query

    bearer_token=$(oc -n openshift-logging create token lokistack-query)

    echo "Verify infrastructure logs in lokistack"
    rm /tmp/loki_query.txt
    curl -s -G -k -H "Authorization: Bearer ${bearer_token}" https://${lokistack_route}/api/logs/v1/infrastructure/loki/api/v1/query_range --data-urlencode 'query={log_type="infrastructure"}' --data-urlencode 'limit=1' -o /tmp/loki_query.txt
    if [[ $(cat /tmp/loki_query.txt |jq '.data.result|length') == 1  ]]; then
       echo "Found infrastructure logs"
    else
       echo "exit, can not find infrastructure logs"
       cat /tmp/loki_query.txt
       exit 1
    fi

    echo "Verify application logs in lokistack"
    rm /tmp/loki_query.txt
    curl -s -G -k -H "Authorization: Bearer ${bearer_token}" https://${lokistack_route}/api/logs/v1/application/loki/api/v1/query_range --data-urlencode 'query={log_type="application"}' --data-urlencode 'limit=1'  -o /tmp/loki_query.txt
    if [[ $(cat /tmp/loki_query.txt |jq '.data.result|length') == 1  ]]; then
       echo "Found application logs"
    else
       echo "exit, can not find application logs"
       cat /tmp/loki_query.txt
    fi

    echo "Verify audit logs in lokistack"
    rm /tmp/loki_query.txt
    curl -s -G -k -H "Authorization: Bearer ${bearer_token}" https://${lokistack_route}/api/logs/v1/audit/loki/api/v1/query_range --data-urlencode 'query={log_type="audit"}' --data-urlencode 'limit=1'  -o /tmp/loki_query.txt
    if [[ $(cat /tmp/loki_query.txt |jq '.data.result|length') == 1  ]]; then
       echo "Found audit logs"
    else
       echo "exit, can not find audit logs"
       cat /tmp/loki_query.txt
       exit 1
    fi
}

########Main###################
if [[ $KUBECONFIG == "" ]]; then
   echo "exit, you must expose the Environment KUBECONFIG"
   exit 1
fi
export CYPRESS_BASE_URL="https://$(oc get route console -n openshift-console  -o jsonpath={.spec.host})"
export KUBECONFIG_PATH=${KUBECONFIG}
echo "KUBECONFIG=${KUBECONFIG}"
echo "Console: $CYPRESS_BASE_URL"

##check_clusterlogging

if [[ $CYPRESS_LOGIN_IDP == "" || $CYPRESS_LOGIN_USERS == "" ]];then
   enable_idp_htpasswd
   export CYPRESS_LOGIN_IDP=uiauto-htpasswd-idp
   export CYPRESS_LOGIN_USERS=$uitest_users
fi

if [[ $CYPRESS_LOGIN_USERS == ""  ]];then
    echo "No IDP is defined, No avaiable users "
else
    echo "Users saved in Environment CYPRESS_LOGIN_USERS"
fi

if [[ "$TEST_TO_RUN" == "" ]];then
    echo "## no value to Env TEST_TO_RUN, run all cases"
    echo "npx cypress run --browser chrome"
    npx cypress run --browser chrome || exit 1
elif [[ "$TEST_TO_RUN"  =~ "--spec " ]];then
    echo "## npx cypress run ${TEST_TO_RUN} --browser chrome"
    npx cypress run ${TEST_TO_RUN} --browser chrome
elif [[ "$TEST_TO_RUN"  =~ "--tag " ]]; then
    tags=${TEST_TO_RUN#*--tag }
    echo "## npx cypress run --env grep=${tags} --browser chrome"
    npx cypress run --env grep=${tags} --browser chrome
else
     echo "exit, unknown TEST_TO_RUN=${TEST_TO_RUN}"
     exit 1
fi
