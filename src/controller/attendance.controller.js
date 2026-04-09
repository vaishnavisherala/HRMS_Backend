
//Attendance 
//check IN
exports.checkIn = async (req, res) => {
  try {
    const emp_id = req.user.id;
    const { reason } = req.body;

    // ✅ IST time for everything
    const istNow = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    // ✅ today in IST
    const today = new Date(
      new Date().toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" })
    );
    today.setHours(0, 0, 0, 0);

    // ✅ late time in IST
    const lateTime = new Date(
      new Date().toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" })
    );
    lateTime.setHours(10, 20, 0, 0);

    const existing = await prisma.attendance.findUnique({
      where: {
        emp_id_date: { emp_id, date: today },
      },
    });

    if (existing) {
      return res.status(400).json({ message: "Already checked in today" });
    }

    let status = "Present";
    if (istNow > lateTime) {
      if (!reason) {
        return res.status(400).json({ message: "Late entry - reason is required" });
      }
      status = "Late";
    }

    const attendance = await prisma.attendance.create({
      data: {
        emp_id,
        date: today,
        check_in: istNow,   // ✅ IST time saved
        status,
        reason: reason || null,
      },
    });

    res.json({
      message: status === "Late" ? "Checked in late (reason recorded)" : "Checked in successfully",
      attendance,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//chck OUT
exports.checkOut = async (req, res) => {
  try {
    const emp_id = req.user.id;

    // ✅ today in IST
    const today = new Date(
      new Date().toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" })
    );
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findUnique({
      where: {
        emp_id_date: { emp_id, date: today },
      },
    });

    if (!attendance) {
      return res.status(400).json({ message: "Check-in first" });
    }

    if (attendance.check_out) {
      return res.status(400).json({ message: "Already checked out" });
    }

    // ✅ checkout time in IST
    const checkOutTime = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    // ✅ calculate hours using IST times
    const hours = (checkOutTime - new Date(attendance.check_in)) / (1000 * 60 * 60);

    let status = attendance.status;
    if (hours < 4) {
      status = "Half-day";
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        check_out: checkOutTime,   // ✅ IST time saved
        status,
      },
    });

    res.json({
      message: status === "Half-day" ? "Checked out (Half-day marked)" : "Checked out successfully",
      working_hours: hours.toFixed(2),
      updated,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//et attendance for logged-in employee
exports.getMyAttendance = async (req, res) => {
  try {
    const emp_id = req.user.id;

    const records = await prisma.attendance.findMany({
      where: { emp_id },
      orderBy: { date: "desc" },
    });

    res.json({ records });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};