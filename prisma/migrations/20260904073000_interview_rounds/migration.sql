-- The stage ladder gained an Online assessment rung and split a single
-- "INTERVIEW" rung into four numbered rounds. Rows recorded under the old
-- vocabulary reached an interview but not a known round, so they land on the
-- first one -- the least the old value can mean.
UPDATE "Application" SET "furthestStage" = 'INTERVIEW_1' WHERE "furthestStage" = 'INTERVIEW';
