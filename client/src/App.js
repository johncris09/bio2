import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import axios from "axios";

import "bootstrap/dist/css/bootstrap.min.css";
import "./css/custom.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashAlt } from "@fortawesome/free-solid-svg-icons";
const api = axios.create({
  baseURL: "http://localhost/project/biometric/api/",
});

const App = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    // fetchData();
  }, []);

  const fetchData = async () => {
    await api
      .get("biometric")
      .then((response) => {
        setData(response.data);
      })
      .catch((error) => {
        console.info(error);
        // toast.error(handleError(error))
      });
  };
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      // Specify the sheet name you want to read
      const sheetName = "Attend. Logs";
      const worksheet = workbook.Sheets[sheetName];

      // Convert the selected sheet to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Implement adjustment algorithm
      const adjustedData = adjustTimes(jsonData); // Implement this function

      const _modifyLog = modifyLog(adjustedData);
      setData(_modifyLog);
    };

    reader.readAsArrayBuffer(file);
  };
  const adjustTimes = (data) => {
    let empLog = [];
    let startDate = "";
    let endDate = "";
    let dateRange = [];
    let yearMonth = "";
    data.forEach((log, index) => {
      const row = log;
      // console.info(row)
      if (row.includes("Date :")) {
        const dateRange = row[row.indexOf("Date :") + 2];
        [startDate, endDate] = dateRange.split(" ~ ");
        yearMonth = new Date(startDate).toISOString().slice(0, 7);
      }
      if (row.includes("Name :")) {
        const employeeId = row[row.indexOf("ID :") + 2];
        const employeeName = row[row.indexOf("Name :") + 2];
        const employeeDept = row[row.indexOf("Dept. :") + 2];

        empLog.push({
          employeeId,
          employeeName,
          employeeDept,
          startDate,
          endDate,
          logs: {},
        });

        const logsIndex = index;
        if (logsIndex < data.length) {
          const logs = data[logsIndex];
          const datesIndex = index + 5;
          const timesIndex = index + 1;
          // Check if logs exist for the employee
          if (logs && datesIndex < data.length && timesIndex < data.length) {
            const dates = data[datesIndex];
            const times = data[timesIndex];
            let type = "login";
            // Loop through the dates and times to populate the logs
            for (let j = 0; j < dates.length; j++) {
              const date = dates[j];
              const time = times[j];
              if (date !== undefined && time !== undefined) {
                // Split the time into logged in and logged out times
                const loggedTime = time.trim().split("\n");

                loggedTime.forEach((row) => {
                  const empIndex = empLog.length - 1;
                  const logsCount = Object.keys(empLog[empIndex].logs).length;
                  empLog[empIndex].logs[logsCount] = {
                    date: formatDateString(yearMonth + "-" + date),
                    type: type,
                    time: row,
                  };
                  type = type === "login" ? "logout" : "login";
                });
              }
            }
          }
        }
      }
    });
    return empLog;
  };

  function findLogIndex(date, type, logsArray) {
    for (let i = 0; i < Object.keys(logsArray).length; i++) {
      if (
        logsArray[Object.keys(logsArray)[i]].date === date &&
        logsArray[Object.keys(logsArray)[i]].type === type
      ) {
        return i; // Return the index if date and type match
      }
    }
    return -1; // Return -1 if not found
  }

  const modifyLog = (data) => {
    let empLog = [];
    data.forEach((row, index) => {
      const {
        employeeDept,
        employeeName,
        endDate,
        startDate,
        employeeId,
        logs,
      } = row;
      const start = new Date(startDate);
      const end = new Date(endDate);

      empLog.push({
        employeeId,
        employeeName,
        employeeDept,
        startDate,
        endDate,
        _logs: [],
      });

      if (Object.keys(logs).length > 0) {
        let _startDate = new Date(startDate);
        let _endDate = new Date(endDate);
        while (_startDate <= _endDate) {
          const date = _startDate.toISOString().split("T")[0];

          const empIndex = empLog.length - 1;
          const logsCount = Object.keys(empLog[empIndex]._logs).length;

          empLog[empIndex]._logs[logsCount] = {
            date: date,
            _time: {},
          };

          let type = "login";
          let loginTime = "";
          let logoutTime = "";
          for (let i = 0; i < 2; i++) {
            const index = findLogIndex(date, type, logs);
            if (index > -1) {
              if (type === "login") {
                empLog[empIndex]._logs[logsCount]._time[type] =
                  logs[index].time; // Set initial value
              } else {
                empLog[empIndex]._logs[logsCount]._time[type] =
                  logs[index].time; // Set initial value
              }
            } else {
              if (type === "login") {
                loginTime = ""; // Reset login time
                empLog[empIndex]._logs[logsCount]._time[type] = ""; // Set initial value
              } else {
                logoutTime = ""; // Reset logout time
                empLog[empIndex]._logs[logsCount]._time[type] = ""; // Set initial value
              }
            }

            type = type === "login" ? "logout" : "login";
          }
          _startDate.setDate(_startDate.getDate() + 1);
        }
      } else {
        for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
          const dateString = date.toISOString().slice(0, 10);

          const empIndex = empLog.length - 1;
          const logsCount = Object.keys(empLog[empIndex]._logs).length;

          empLog[empIndex]._logs[logsCount] = {
            date: dateString,
            _time: {},
          };
          let type = "login";
          let loginTime = "";
          let logoutTime = "";
          for (let i = 0; i < 2; i++) {
            if (type === "login") {
              loginTime = ""; // Reset login time
              empLog[empIndex]._logs[logsCount]._time[type] = ""; // Set initial value
            } else {
              logoutTime = ""; // Reset logout time
              empLog[empIndex]._logs[logsCount]._time[type] = ""; // Set initial value
            }

            type = type === "login" ? "logout" : "login";
          }
        }
      }
    });
    return empLog;
  };

  function formatDateString(dateString) {
    const dateParts = dateString.split("-");
    const year = dateParts[0];
    const month = dateParts[1].padStart(2, "0"); // Ensure month is two digits
    const day = dateParts[2].padStart(2, "0"); // Ensure day is two digits

    return `${year}-${month}-${day}`;
  }

  return (
    <>
      <div className="container">
        <div className="my-2">
          <input type="file" onChange={handleFileUpload} accept=".xlsx, .xls" />
        </div>

        <hr />
        {data.map((row, index) => (
          <div key={index}>
            <p>
              Name: {row.employeeName} <br />
              PERIOD: {row.employeeDept} <br />
              Official Hours: _____________
              <br />
            </p>
            <table>
              <tr>
                <td colSpan={2}></td>
                <td colSpan={2}>AM</td>
                <td colSpan={2}>PM</td>
              </tr>
              <tr>
                <td colSpan={2}>Date</td>
                <td>IN</td>
                <td>OUT</td>
                <td>IN</td>
                <td>OUT</td>
                <td>HOURS</td>
                <td>MINUTE</td>
              </tr>
              <tbody>
                {Object.values(row._logs).map((row, index) => (
                  <tr key={index}>
                    <td>{new Date(row.date).getDate()} </td>
                    <td>
                      {new Intl.DateTimeFormat("en-US", {
                        weekday: "short",
                      }).format(new Date(row.date))}
                    </td>
                    <td>{row._time.login}</td>
                    <td> </td>

                    <td>{row._time.logout}</td>
                    <td> </td>
                    <td> </td>
                    <td> </td>
                  </tr>
                ))}
                <tr key={index}>
                  <td colSpan={6}>Total UnderTime </td>
                  <td></td>
                  <td> </td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </>
  );
};

export default App;
