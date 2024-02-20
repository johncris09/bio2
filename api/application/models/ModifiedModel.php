<?php

defined('BASEPATH') or exit('No direct script access allowed');

class ModifiedModel extends CI_Model
{
    public function insert($data)
    {
        return $this->db->insert('modified', $data);
    }
 
    public function insertToLogin($data)
    {
         $this->db->insert('modified', $data);
         return $this->db->insert_id();
    }
    public function findByDateAndEmployeeId($data)
    {

        $query = $this->db
            ->where($data) 
            ->get('modified');
        return $query->result();
    }
     
    public function getByDateAndEmployeeID($data)
    {

        $query = $this->db
            ->where($data) 
            ->get('modified');
        return $query->result();
    }
    public function get($data)
    {

        $query = $this->db
            ->where($data)
            ->get('modified');
        return $query->row();
    }
    public function update($id, $data)
	{
		$this->db->where('id', $id);
		return $this->db->update('modified', $data);
	}
 
    public function updateLogout($where, $data)
	{
		$this->db->where($where);
		return $this->db->update('modified', $data);
	}
}
