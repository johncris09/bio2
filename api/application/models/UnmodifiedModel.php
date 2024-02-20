<?php

defined('BASEPATH') or exit('No direct script access allowed');

class UnmodifiedModel extends CI_Model
{
    public function insert($data)
    {
        return $this->db->insert('unmodified', $data);
    }

    public function getLogsByEmployeeId($data)
    {

        $query = $this->db
            ->where($data)
            ->where('remark', 0)
            ->get('unmodified');
        return $query->result();
    }
    public function update($id, $data)
    {
        $this->db->where('id', $id);
        return $this->db->update('unmodified', $data);
    }

    function getTheNextDate($empid)
    {

        $query = $this->db
            ->where('employee_id', $empid)
            ->where('remark', 0)
            ->order_by('id, date', 'asc')
            ->get('unmodified');

        return $query->row();
    }
}