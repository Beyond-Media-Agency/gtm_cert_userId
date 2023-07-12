gcloud functions deploy gtm-cert-hash \
--runtime nodejs20 --trigger-http --source=. \
--entry-point=hash --gen2 --region=us-central1 \

