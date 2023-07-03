# Google GTM Certification use case
## To replicate:
- set your environment variables in a .env file (SVC_ACC_FILE,PRIVATE_KEY,PROJECT_ID)
- ```
   cloud functions deploy gtm-cert-encrypt --gen2 --region=us-central1 --runtime=nodejs20 --source=. --entry-point=hash --trigger-http
  ```
### To save userId and encryption to DB:
- create pubsub topic
- add TOPIC=yourtopic and SAVE_TO_DB=TRUE to .env
- ```
  gcloud functions deploy gtm-cert-save-to-db --gen2 --region=us-central1 --runtime=nodejs20 --source=. --entry-point=save_to_db --trigger-topic="yourtopic"
  ```
