-- 00014_seed_exercise_videos.sql
-- Seed video URLs for core exercises
-- Format: "youtube:VIDEO_ID"

-- Chest exercises
UPDATE exercises SET video_url = 'youtube:rT7DgCr-3pg' WHERE LOWER(name) = 'bench press (barbell)' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:VmB1G1K7v94' WHERE LOWER(name) = 'bench press (dumbbell)' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:SrqOu55lrYU' WHERE LOWER(name) = 'incline bench press (barbell)' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:8iPEnn-ltC8' WHERE LOWER(name) = 'incline bench press (dumbbell)' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:eozdVDA78K0' WHERE LOWER(name) = 'chest fly (dumbbell)' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:Iwe6AmxVf7o' WHERE LOWER(name) = 'chest fly (cable)' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:IODxDxX7oi4' WHERE LOWER(name) = 'push-up' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:2z8JmcrW-As' WHERE LOWER(name) = 'dip' AND video_url IS NULL;

-- Back exercises
UPDATE exercises SET video_url = 'youtube:op9kVnSso6Q' WHERE LOWER(name) = 'deadlift (barbell)' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:jEy_czb3RKA' WHERE LOWER(name) = 'romanian deadlift' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:FWJR5Ve8bnQ' WHERE LOWER(name) = 'bent over row (barbell)' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:pYcpY20QaE8' WHERE LOWER(name) = 'bent over row (dumbbell)' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:CAwf7n6Luuc' WHERE LOWER(name) = 'lat pulldown' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:GZbfZ033f74' WHERE LOWER(name) = 'seated cable row' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:eGo4IYlbE5g' WHERE LOWER(name) = 'pull-up' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:j3Igk5nyZE4' WHERE LOWER(name) = 't-bar row' AND video_url IS NULL;

-- Shoulder exercises
UPDATE exercises SET video_url = 'youtube:2yjwXTZQDDI' WHERE LOWER(name) = 'overhead press (barbell)' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:qEwKCR5JCog' WHERE LOWER(name) = 'overhead press (dumbbell)' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:3VcKaXpzqRo' WHERE LOWER(name) = 'lateral raise' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:-t7fuZ0KhDA' WHERE LOWER(name) = 'front raise' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:rep-qVOkqgk' WHERE LOWER(name) = 'face pull' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:lPt0GqwaqEw' WHERE LOWER(name) = 'reverse fly' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:cJRVVxmytaM' WHERE LOWER(name) = 'shrug (barbell)' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:cJRVVxmytaM' WHERE LOWER(name) = 'shrug (dumbbell)' AND video_url IS NULL;

-- Leg exercises
UPDATE exercises SET video_url = 'youtube:ultWZbUMPL8' WHERE LOWER(name) = 'squat (barbell)' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:m4ytaCJZpl0' WHERE LOWER(name) = 'front squat' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:MeIiIdhvXT4' WHERE LOWER(name) = 'goblet squat' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:IZxyjW7MPJQ' WHERE LOWER(name) = 'leg press' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:D7KaRcUTQeE' WHERE LOWER(name) = 'lunge (dumbbell)' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:YyvSfVjQeL0' WHERE LOWER(name) = 'leg extension' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:1Tq3QdYUuHs' WHERE LOWER(name) = 'leg curl' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:gwLzBJYoWlI' WHERE LOWER(name) = 'calf raise (standing)' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:JbyjNymZOt0' WHERE LOWER(name) = 'calf raise (seated)' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:SEdqd1n0icg' WHERE LOWER(name) = 'hip thrust' AND video_url IS NULL;

-- Arm exercises - Biceps
UPDATE exercises SET video_url = 'youtube:kwG2ipFRgfo' WHERE LOWER(name) = 'bicep curl (barbell)' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:ykJmrZ5v0Oo' WHERE LOWER(name) = 'bicep curl (dumbbell)' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:TwD-YGVP4Bk' WHERE LOWER(name) = 'hammer curl' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:fIWP-FRFNU0' WHERE LOWER(name) = 'preacher curl' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:0AUGkch3tzc' WHERE LOWER(name) = 'concentration curl' AND video_url IS NULL;

-- Arm exercises - Triceps
UPDATE exercises SET video_url = 'youtube:2-LAMcpzODU' WHERE LOWER(name) = 'tricep pushdown' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:YbX7Wd8jQ-Q' WHERE LOWER(name) = 'overhead tricep extension' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:d_KZxkY_0cM' WHERE LOWER(name) = 'skull crusher' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:nEF0bv2FW94' WHERE LOWER(name) = 'close grip bench press' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:6kALZikXxLc' WHERE LOWER(name) = 'tricep dip' AND video_url IS NULL;

-- Core exercises
UPDATE exercises SET video_url = 'youtube:ASdvN_XEl_c' WHERE LOWER(name) = 'plank' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:Xyd_fa5zoEU' WHERE LOWER(name) = 'crunch' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:AV5PmSJyXow' WHERE LOWER(name) = 'cable crunch' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:hdng3Nm1x30' WHERE LOWER(name) = 'hanging leg raise' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:wkD8rjkodUI' WHERE LOWER(name) = 'russian twist' AND video_url IS NULL;
UPDATE exercises SET video_url = 'youtube:rqiTPdK1c_I' WHERE LOWER(name) = 'ab rollout' AND video_url IS NULL;
