const fs = require("fs");

function timeToSeconds(time) {
    let parts = time.split(" ");
    let clock = parts[0].split(":");
    let period = parts[1];

    let hours = parseInt(clock[0]);
    let minutes = parseInt(clock[1]);
    let seconds = parseInt(clock[2]);

    if (period === "pm" && hours !== 12) {
        hours += 12;
    }

    if (period === "am" && hours === 12) {
        hours = 0;
    }

    return hours * 3600 + minutes * 60 + seconds;
}

function secondsToTime(seconds) {
    let h = Math.floor(seconds / 3600);
    let m = Math.floor((seconds % 3600) / 60);
    let s = seconds % 60;

    if (m < 10) m = "0" + m;
    if (s < 10) s = "0" + s;

    return h + ":" + m + ":" + s;
}

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
     let start = timeToSeconds(startTime);
    let end = timeToSeconds(endTime);

    let duration = end - start;

    return secondsToTime(duration);

}


// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    let start = timeToSeconds(startTime);
    let end = timeToSeconds(endTime);

    let deliveryStart = timeToSeconds("8:00:00 am");
    let deliveryEnd = timeToSeconds("10:00:00 pm");

    let idleSeconds = 0;

    if (start < deliveryStart) {
        idleSeconds += deliveryStart - start;
    }

    if (end > deliveryEnd) {
        idleSeconds += end - deliveryEnd;
    }

    return secondsToTime(idleSeconds);
}


// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
     let shift = timeToSeconds(shiftDuration + " am");
    let idle = timeToSeconds(idleTime + " am");

    let active = shift - idle;

    return secondsToTime(active);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
     let quota;

    if (date >= "2025-04-10" && date <= "2025-04-30") {
        quota = "6:00:00";
    } else {
        quota = "8:24:00";
    }

    let active = timeToSeconds(activeTime + " am");
    let required = timeToSeconds(quota + " am");

    if (active >= required) {
        return true;
    } else {
        return false;
    }
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    let data = fs.readFileSync(textFile, "utf8").trim();
    let lines = data.split("\n");

    for (let i = 0; i < lines.length; i++) {
        let parts = lines[i].split(",");

        if (parts[0] === shiftObj.driverID && parts[2] === shiftObj.date) {
            return {};
        }
    }

    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let metQuotaValue = metQuota(shiftObj.date, activeTime);

    let fullRecord = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: metQuotaValue,
        hasBonus: false
    };

    let newLine =
        fullRecord.driverID + "," +
        fullRecord.driverName + "," +
        fullRecord.date + "," +
        fullRecord.startTime + "," +
        fullRecord.endTime + "," +
        fullRecord.shiftDuration + "," +
        fullRecord.idleTime + "," +
        fullRecord.activeTime + "," +
        fullRecord.metQuota + "," +
        fullRecord.hasBonus;

    fs.appendFileSync(textFile, "\n" + newLine);

    return fullRecord;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    let data = fs.readFileSync(textFile, "utf8");

    let lines = data.split("\n");

    for (let i = 0; i < lines.length; i++) {
        let parts = lines[i].split(",");

        if (parts[0] === driverID && parts[2] === date) {
            parts[9] = newValue;
            lines[i] = parts.join(",");
        }
    }

    fs.writeFileSync(textFile, lines.join("\n"));
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    let data = fs.readFileSync(textFile, "utf8").trim();
    let lines = data.split("\n");

    let count = 0;
    let found = false;
    let targetMonth = parseInt(month);

    for (let i = 0; i < lines.length; i++) {
        let parts = lines[i].split(",");

        if (parts[0].trim() === driverID) {
            found = true;

            let date = parts[2].trim();
            let rowMonth = parseInt(date.split("-")[1]);
            let hasBonus = parts[9].trim();

            if (rowMonth === targetMonth && hasBonus === "true") {
                count++;
            }
        }
    }

    if (found === false) {
        return -1;
    }

    return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
   let data = fs.readFileSync(textFile, "utf8").trim();
    let lines = data.split("\n");
    let totalSeconds = 0;
    let targetMonth = parseInt(month);

    for (let i = 0; i < lines.length; i++) {
        let parts = lines[i].split(",");

        if (parts[0].trim() === driverID) {
            let date = parts[2].trim();
            let rowMonth = parseInt(date.split("-")[1]);

            if (rowMonth === targetMonth) {
                let activeTime = parts[7].trim();
                totalSeconds += timeToSeconds(activeTime + " am");
            }
        }
    }

    return secondsToTime(totalSeconds);
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
     let ratesData = fs.readFileSync(rateFile, "utf8").trim();
    let rateLines = ratesData.split("\n");

    let dayOff = "";
    for (let i = 0; i < rateLines.length; i++) {
        let parts = rateLines[i].split(",");

        if (parts[0].trim() === driverID) {
            dayOff = parts[1].trim();
            break;
        }
    }

    let shiftsData = fs.readFileSync(textFile, "utf8").trim();
    let shiftLines = shiftsData.split("\n");

    let totalSeconds = 0;
    let targetMonth = parseInt(month);

    for (let i = 0; i < shiftLines.length; i++) {
        let parts = shiftLines[i].split(",");

        if (parts[0].trim() === driverID) {
            let date = parts[2].trim();
            let rowMonth = parseInt(date.split("-")[1]);

            if (rowMonth === targetMonth) {
                let weekday = new Date(date).toLocaleDateString("en-US", { weekday: "long" });

                if (weekday !== dayOff) {
                    if (date >= "2025-04-10" && date <= "2025-04-30") {
                        totalSeconds += timeToSeconds("6:00:00 am");
                    } else {
                        totalSeconds += timeToSeconds("8:24:00 am");
                    }
                }
            }
        }
    }

    totalSeconds -= bonusCount * 2 * 3600;

    return secondsToTime(totalSeconds);
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    let data = fs.readFileSync(rateFile, "utf8").trim();
    let lines = data.split("\n");

    let basePay = 0;
    let tier = 0;

    for (let i = 0; i < lines.length; i++) {
        let parts = lines[i].split(",");

        if (parts[0].trim() === driverID) {
            basePay = parseInt(parts[2].trim());
            tier = parseInt(parts[3].trim());
            break;
        }
    }

    let actual = timeToSeconds(actualHours + " am");
    let required = timeToSeconds(requiredHours + " am");

    let missingSeconds = required - actual;

    if (missingSeconds <= 0) {
        return basePay;
    }

    let allowedHours = 0;

    if (tier === 1) {
        allowedHours = 50;
    } else if (tier === 2) {
        allowedHours = 20;
    } else if (tier === 3) {
        allowedHours = 10;
    } else if (tier === 4) {
        allowedHours = 3;
    }

    let extraMissingSeconds = missingSeconds - (allowedHours * 3600);

    if (extraMissingSeconds <= 0) {
        return basePay;
    }

    let extraMissingHours = Math.floor(extraMissingSeconds / 3600);
    let deductionRatePerHour = Math.floor(basePay / 185);
    let deduction = extraMissingHours * deductionRatePerHour;

    return basePay - deduction;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
