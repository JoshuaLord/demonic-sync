-- Add foreign key constraint from route_steps to official_tasks
ALTER TABLE route_steps
ADD CONSTRAINT route_steps_task_id_fkey
FOREIGN KEY (task_id)
REFERENCES official_tasks(id)
ON DELETE SET NULL;
