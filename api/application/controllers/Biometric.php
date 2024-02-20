<?php
defined('BASEPATH') or exit('No direct script access allowed');

require APPPATH . '/libraries/CreatorJwt.php';
require APPPATH . 'libraries/RestController.php';
require APPPATH . 'libraries/Format.php';

use chriskacerguis\RestServer\RestController;

class Biometric extends RestController
{

  function __construct()
  {
    // Construct the parent class
    parent::__construct();
    $this->objOfJwt = new CreatorJwt();

    $this->load->model('EmployeeModel');
    $this->load->model('UnmodifiedModel');
    $this->load->model('ModifiedModel'); 
    $this->load->helper('crypto_helper');
  }




  public function index_get()
  {
    $model = new EmployeeModel;
    $modified = new ModifiedModel;
    $data = [];

    $employee = $model->getEmployee();
    foreach ($employee as $emp) {
      $start_date = $emp->start_date;

      $data[] = array(
        'employee_id' => $emp->employee_id,
        'department' => $emp->department,
        'name' => $emp->name,
        'start_date' => $emp->start_date,
        'end_date' => $emp->end_date,
        'logs' => []
      );
      $start = new DateTime($emp->start_date);
      $end = new DateTime($emp->end_date);

     
      $current = clone $start;
      while ($current <= $end) {
        $date = $current->format('Y-m-d');
     
        
        $bio =  $modified->getByDateAndEmployeeID(['employee_id' =>  $emp->employee_id  , 'date' => $date]);
        
        if($bio){
          foreach($bio as $row){

            $data[count($data) - 1]['logs'][] = array(
              'date'=> $date,
              'login' => $row->login,
              'logout' => $row->logout,
            );
          }
        }else{
          $data[count($data) - 1]['logs'][] = array(
            'date'=> $date,
            'login' => '',
            'logout' => '',
          );
        }  
        $current->modify('+1 day');  
      } 
    } 
    $this->response($data, RestController::HTTP_OK);
  }


  public function insertToUnmodified_post()
  {

    $model = new EmployeeModel;
    $unmodified = new UnmodifiedModel;
    $requestData = json_decode($this->input->raw_input_stream, true);

    $logData = [];
    // $employee_data= [];
    foreach ($requestData as $row) {

      $employee_data = array(
        'employee_id' => $row['employeeId'],
        'name' => $row['employeeName'],
        'department' => $row['employeeDept'],
        'start_date' => $row['startDate'],
        'end_date' => $row['endDate'],
      );
      // insert to employee
      $insert_employee = $model->insert($employee_data);

      foreach ($row['logs'] as $log) {
        foreach ($log['loggedTime'] as $time) {
          $logData = array(
            'employee_id' => $insert_employee,
            'date' => $log['date'],
            'time' => $time,
          );

          $insert_log = $unmodified->insert($logData);
        }

      }

    }
    $this->modify_get();
    $this->response($insert_log, RestController::HTTP_OK);
  }


  public function clear_table_post()
  {
    $model = new EmployeeModel;
    $result = $model->clearTable();
    $this->response($result, RestController::HTTP_OK);
  }



  public function modify_get()
  {
    $model = new EmployeeModel;
    $unmodified = new UnmodifiedModel;
    $modified = new ModifiedModel;
    $employee = $model->getEmployee();
    $_insertLoginId = '';
    $currentDate = '';

    foreach ($employee as $emp) {

      $emp_id = array(
        'employee_id' => $emp->id
      );
      $logs = $unmodified->getLogsByEmployeeId($emp_id);
      foreach ($logs as $log) {



        // if that date of that employee has login
        if ($currentDate == '') {

          $newLogs = $modified->findByDateAndEmployeeId(['employee_id' => $log->employee_id]);
        } else {

          $newLogs = $modified->findByDateAndEmployeeId(['employee_id' => $log->employee_id, 'date' => $currentDate]);
        }

        if (empty($newLogs)) {
          // if no login found, insert login
          $loginData = array(
            'employee_id' => $log->employee_id,
            'date' => $log->date,
            'login' => $log->time
          );

          // update the remark of time
          $remarkData = array(
            'remark' => 1,
          );
          $unmodified->update($log->id, $remarkData);


          $insertToLogin = $modified->insertToLogin($loginData);
          $_insertLoginId = $insertToLogin;
          $currentDate = $log->date;



        } else {

          $_log = $modified->get(['id' => $_insertLoginId]);
          if (empty($_log->logout)) {
            $logoutData = array(
              'logout' => $log->time
            );
            $where = array(
              'id' => $_insertLoginId,
            );
            $modified->updateLogout($where, $logoutData);



            // update the remark of time
            $remarkData = array(
              'remark' => 1,
            );
            $unmodified->update($log->id, $remarkData);
            $_insertLoginId = '';
            $nextDate = $unmodified->getTheNextDate($log->employee_id);
            if (isset($nextDate->date)) {

              $currentDate = $nextDate->date;
            } else {

              $currentDate = '';
            }

          }
        }

      }
      $currentDate = '';

    }
  }







}