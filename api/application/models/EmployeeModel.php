<?php

defined('BASEPATH') or exit('No direct script access allowed');

class EmployeeModel extends CI_Model
{

    public function insert($data)
    {
        $this->db->insert('employee', $data);
        return $this->db->insert_id();
    }

    public function clearTable()
    {
        $this->db->truncate('unmodified');
        $this->db->truncate('modified');
        $this->db->truncate('employee');
        return true;
    }
    public function getEmployee()
    {

        $query = $this->db->get('employee');
        return $query->result();
    }


    public function pair_logs()
    {
        // Retrieve unmodified employee logs
        $logs = $this->db->get('unmodified')->result();

        foreach ($logs as $log) {
            // Check if this time has been used in the modified table
            if ($log->remark == 1) {
                continue; // Skip if already used
            }

            // Find the corresponding logout time
            $logout = $this->db->where('employee_id', $log->employee_id)
                ->where('date', $log->date)
                ->where('time >', $log->time)
                ->where('remark', 0)
                ->order_by('time', 'ASC')
                ->limit(1)
                ->get('unmodified')
                ->row();

            if ($logout) {
                // Update the modified employee table with login and logout times
                $data = array(
                    'employee_id' => $log->employee_id,
                    'date' => $log->date,
                    'login' => $log->time,
                    'logout' => $logout->time
                );
                $this->db->insert('modified', $data);

                // Mark the times as used in the unmodified table
                $this->db->set('remark', 1)
                    ->where('id', $log->id)
                    ->update('unmodified');

                $this->db->set('remark', 1)
                    ->where('id', $logout->id)
                    ->update('unmodified');
            }
        }
    }

}