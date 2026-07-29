<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */
$routes->get('/', 'Curation::index');
$routes->post('start', 'Curation::start');
$routes->get('curate', 'Curation::curate');
$routes->get('api/next', 'Curation::next');
$routes->post('api/save', 'Curation::save');
