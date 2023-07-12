gcloud functions deploy gtm-cert_onTableCreated \
  --runtime nodejs20 \
  --trigger-topic gtm-cert_daily-analytics-export-complete \
  --source=. --entry-point=onTableCreated

