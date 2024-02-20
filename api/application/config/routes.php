<?php
defined('BASEPATH') or exit('No direct script access allowed');
 


$route['default_controller'] = 'welcome';
$route['404_override'] = '';
$route['translate_uri_dashes'] = FALSE; 

// User
$route['biometric'] = 'Biometric';
$route['biometric/display'] = 'Biometric/modify';
$route['biometric/clear_table'] = 'Biometric/clear_table';
 