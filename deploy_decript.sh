gcloud functions deploy gtm-cert_decrypt \
--runtime nodejs20 --trigger-http --source=. \
--entry-point=decrypt --gen2 --region=us-central1 \
--ingress-settings all

