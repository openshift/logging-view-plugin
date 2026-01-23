#!/usr/bin/env bash
set +x
# Author: anli@redhat.com
# Description: Run Logging UI test using the given users. 
#   prerequisite: 
#      clusterlogging are deployed, appplication, infrastructure and audit logs are sent to lokistack.
#      The pod produce logs in namespaces log-test-app1,log-test-app2 unceasingly.
#      (Note: In prow, the step openshift-observability-enable-cluster-logging can prepare test data)
#      The test need at least two users in the given IDP.
#        The function enable_idp_htpasswd can create htpasswd IPD with five users 
#        You can also provide IDP using Environment CYPRESS_LOGIN_IDP,CYPRESS_LOGIN_USERS. 
#      The Environment KUBECONFIG must be exported.
#      The CYPRESS_SPEC can be used to specify spec. The default value is cypress/e2e/logging/*.ts
#      The CYPRESS_TAG can be used to filter cases by tag
#

## Add htpasswd IDP and Users
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_USERS=""

function enable_idp_htpasswd()
{
    echo "## Create htpasswd IDP users"
    htpass_file="/tmp/uihtpasswd"
    uiusers_file="/tmp/uihtpusers"

    idp_list=$(oc get oauth cluster -o jsonpath='{.spec.identityProviders}')
    if [[ $idp_list =~ "uiauto-htpasswd-idp" ]];then
        # using existing idp if the user can login
        echo "The idp uiauto-htpasswd-idp had been created"
        if [[ -f $uiusers_file ]];then
            echo "Verify if user can login uiauto-htpasswd-idp"
            UI_USERS=$(cat $uiusers_file)
            echo "get users from ${uiusers_file}"
            first_record=${UI_USERS%%,*}
            first_passwd=${first_record##*:}
            cp $KUBECONFIG /tmp/normal_kubeconfig || exit 1
            oc login  --username=uiauto-test-1 --password=${first_passwd} --kubeconfig=/tmp/normal_kubeconfig >/dev/null  2>&1
            if [[ $? == 0 ]];then
                echo "Login the idp succesed, the users are in $uiusers_file"
                echo "Enable IDP uiauto-htpasswd-idp succesfully"
                return 0
            else
                echo "Can not login the idp, please remove uiauto-htpasswd-idp from oauth/cluster and re-run this script"
                exit 1
            fi
        else
            echo "Can not find users, please remove uiauto-htpasswd-idp from oauth/cluster and re-run this script"
            exit 1
        fi 
    fi

    echo "Create new users and add uiauto-htpasswd-idpuiauto-htpasswd-idp"
    #Create users with random password and save users
    for i in $(seq 1 5); do
        username="uiauto-test-${i}"
        password=$(tr </dev/urandom -dc 'a-z0-9' | fold -w 12 | head -n 1 || true)
        UI_USERS+="${username}:${password},"
        if [ -f "${htpass_file}" ]; then
            htpasswd -B -b ${htpass_file} "${username}" "${password}"
        else
            htpasswd -c -B -b ${htpass_file} "${username}" "${password}"
        fi
    done
    # remove trailing ',' for case parsing
    UI_USERS=${UI_USERS%?}
    echo $UI_USERS >$uiusers_file
    echo "Users are store in ${UI_USERS}"

    # record current generation number
    gen_number=$(oc -n openshift-authentication get deployment oauth-openshift -o jsonpath='{.metadata.generation}')

    # add users to cluster
    oc -n openshift-config create secret generic uiauto-htpass-secret  || true
    oc -n openshift-config set data secret/uiauto-htpass-secret --from-file=htpasswd=${htpass_file} -n openshift-config || exit 1

    idp_list=$(oc get oauth cluster -o jsonpath='{.spec.identityProviders}')
    if [[ $idp_list == ""  || $idp_list == "{}" ]];then
        oc patch oauth cluster --type='json' -p='[{"op": "add", "path": "/spec/identityProviders", "value": [{"type": "HTPasswd", "name": "uiauto-htpasswd-idp", "mappingMethod": "claim", "htpasswd":{"fileData":{"name": "uiauto-htpass-secret"}}}]}]' || exit 1
    else
        oc patch oauth cluster --type='json' -p='[{"op": "add", "path": "/spec/identityProviders/-", "value": {"type": "HTPasswd", "name": "uiauto-htpasswd-idp", "mappingMethod": "claim", "htpasswd":{"fileData":{"name": "uiauto-htpass-secret"}}}}]' || exit 1
    fi

    echo "Wait up to 5 minutes for new idp take effect"
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
    echo "Login as the new user"
    cp $KUBECONFIG /tmp/normal_kubeconfig || exit 1
    first_record=${UI_USERS%%,*}
    first_passwd=${first_record##*:}

    echo "oc login -u uiauto-test-1 -p <first_user_passwd> --config=/tmp/normal_kubeconfig"
    oc login  --username=uiauto-test-1 --password=${first_passwd} --kubeconfig=/tmp/normal_kubeconfig >/dev/null 2>&1 || exit 1
    echo "Enable IDP uiauto-htpasswd-idp succesfully"
}

function check_clusterlogging(){
    echo "## Verify test data are ready for Logging UI Test"

    echo "Check if the clusterlogging are are ready"
    lokistack_name=$(oc get lokistack -n openshift-logging -o jsonpath={.items[0].metadata.name})
    if [[ $lokistack_name == "" ]]; then
        echo "No lokistack can be found in openshift-logging namespace"
        exit 1
    fi
    echo "Warnig, lokistack ${lokistack_name} is selected, please confirm if that is the one you are using in openshift-logging"
    oc -n openshift-logging wait pod --for=condition=ready -l  app.kubernetes.io/instance=${lokistack_name} || exit 1
    oc -n openshift-logging wait pod --for=condition=ready -l  app.kubernetes.io/component=collector || exit 1


    echo "Check if there are running test pods in log-test-app1 and log-test-app2"
    oc -n log-test-app1 wait pod --for=condition=ready -l test=centos-logtest || exit 1
    oc -n log-test-app2 wait pod --for=condition=ready -l test=centos-logtest || exit 1

    echo "Check if logs can be found in lokistack"
    lokistack_route=$(oc -n openshift-logging get route ${lokistack_name} -n openshift-logging -o json |jq '.spec.host' -r)
    oc -n openshift-logging create sa lokistack-query >/dev/null 2>&1
    oc -n openshift-logging adm policy add-cluster-role-to-user cluster-admin -z lokistack-query
    oc -n openshift-logging adm policy add-cluster-role-to-user cluster-logging-application-view -z lokistack-query
    oc -n openshift-logging adm policy add-cluster-role-to-user cluster-logging-audit-view -z lokistack-query
    oc -n openshift-logging adm policy add-cluster-role-to-user cluster-logging-infrastructure-view -z lokistack-query

    bearer_token=$(oc -n openshift-logging create token lokistack-query)

    echo "Verify infrastructure logs in lokistack"
    rm /tmp/loki_query.txt
    curl -s -G -k -H "Authorization: Bearer ${bearer_token}" https://${lokistack_route}/api/logs/v1/infrastructure/loki/api/v1/query_range --data-urlencode 'query={log_type="infrastructure"}' --data-urlencode 'limit=1' -o /tmp/loki_query.txt
    if [[ $(cat /tmp/loki_query.txt |jq '.data.result|length') == 1  ]]; then
       echo "Found infrastructure logs"
    else
       echo "Exit, can not find infrastructure logs"
       cat /tmp/loki_query.txt
       exit 1
    fi

    echo "Verify application logs in lokistack"
    rm /tmp/loki_query.txt
    curl -s -G -k -H "Authorization: Bearer ${bearer_token}" https://${lokistack_route}/api/logs/v1/application/loki/api/v1/query_range --data-urlencode 'query={log_type="application"}' --data-urlencode 'limit=1'  -o /tmp/loki_query.txt
    if [[ $(cat /tmp/loki_query.txt |jq '.data.result|length') == 1  ]]; then
       echo "Found application logs"
    else
       echo "Exit, can not find application logs"
       cat /tmp/loki_query.txt
    fi

    echo "Verify audit logs in lokistack"
    rm /tmp/loki_query.txt
    curl -s -G -k -H "Authorization: Bearer ${bearer_token}" https://${lokistack_route}/api/logs/v1/audit/loki/api/v1/query_range --data-urlencode 'query={log_type="audit"}' --data-urlencode 'limit=1'  -o /tmp/loki_query.txt
    if [[ $(cat /tmp/loki_query.txt |jq '.data.result|length') == 1  ]]; then
       echo "Found audit logs"
    else
       echo "Exit, can not find audit logs"
       cat /tmp/loki_query.txt
       exit 1
    fi
}

########Main###################
if [[ $KUBECONFIG == "" ]]; then
   echo "Exit, you must expose the Environment KUBECONFIG"
   exit 1
fi

export CYPRESS_BASE_URL="https://$(oc get route console -n openshift-console  -o jsonpath={.spec.host})"
export CYPRESS_OPENSHIFT_VERSION=$(oc version -o json  |jq -r '.openshiftVersion'|cut -f 1,2 -d.)
clusterlogging_csv=$(oc -n openshift-logging get csv -l "operators.coreos.com/cluster-logging.openshift-logging" -o jsonpath='{.items[0].metadata.name}')
if [[ $clusterlogging_csv == "" ]];then
    echo "can not find the cluster-logging csv"
    exit 1
fi
clusterlogging_csv_version=${clusterlogging_csv#cluster-logging.v}
export CYPRESS_CLUSTERLOGGING_VERSION=$(echo $clusterlogging_csv_version|cut -d. -f1,2)

coo_csv=$(oc get csv -l olm.copiedFrom"="openshift-cluster-observability-operator -o jsonpath='{.items[0].metadata.name}')
export CYPRESS_COO_VERSION=${coo_csv//cluster-observability-operator.v}

data_mode=$(oc get uiplugin logging -o jsonpath='{.spec.logging.schema}')
if [[ "$data_mode" == "" ]];then
    data_mode="viaq"
fi
export CYPRESS_CLUSTERLOGGING_DATAMODE=${data_mode}

check_clusterlogging

if [[ "$CYPRESS_LOGIN_IDP" == "" || "$CYPRESS_LOGIN_USERS" == "" ]];then
   enable_idp_htpasswd
   export CYPRESS_LOGIN_IDP=uiauto-htpasswd-idp
   export CYPRESS_LOGIN_USERS=$UI_USERS
fi
if [[ $CYPRESS_LOGIN_USERS == "" ]];then
   echo "Please set correct Env CYPRESS_LOGIN_USERS  and CYPRESS_LOGIN_IDP or leave these two Env unset"
   exit 1
fi

echo "export KUBECONFIG=${KUBECONFIG}"
echo "export CYPRESS_BASE_URL=$CYPRESS_BASE_URL"
echo "export CYPRESS_LOGIN_IDP=$CYPRESS_LOGIN_IDP"
echo "export CYPRESS_LOGIN_USERS=$CYPRESS_LOGIN_USERS"
echo "export CYPRESS_OPENSHIFT_VERSION=$CYPRESS_OPENSHIFT_VERSION"
echo "export CYPRESS_CLUSTERLOGGING_VERSION=$CYPRESS_CLUSTERLOGGING_VERSION"
echo "export CYPRESS_CLUSTERLOGGING_DATAMODE=$CYPRESS_CLUSTERLOGGING_DATAMODE"
echo "export CYPRESS_COO_VERSION=${CYPRESS_COO_VERSION}"

echo "## Execute Cypress cases"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd $script_dir/../

cypress_args=""
if [[ "$CYPRESS_SPEC" == "" ]];then
    cypress_args=" --spec $(ls cypress/e2e/logging/*.ts|paste -sd ',' -)"
else
    cypress_args=" --spec ${CYPRESS_SPEC}"
fi
if [[ "$CYPRESS_TAG" != "" ]]; then
    cypress_args="$cypress_args --env grep=${CYPRESS_TAG// /}"
fi
echo "npx cypress run --e2e ${cypress_args}"
npx cypress run --e2e ${cypress_args}
