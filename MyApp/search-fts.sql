ATTACH DATABASE '../App_Data/app.db' AS app_db;

DROP TABLE IF EXISTS GenerationFts;
CREATE VIRTUAL TABLE GenerationFts USING FTS5(GenerationId,Text);

INSERT INTO GenerationFts (rowid,GenerationId,Text)
SELECT A.Id, A.GenerationId, A.Description || '. Caption: ' || A.Caption || '. Description: ' || A.Description || '. Tags: ' || GROUP_CONCAT(key, ',') AS Text
FROM app_db.Artifact A, json_each(A.Tags)
WHERE A.PublishedDate IS NOT NULL
GROUP BY A.Id;

DETACH DATABASE app_db;
