/**
 * Excel Processor
 * Reads, validates, and processes student data from Excel files
 */

const ExcelJS = require('exceljs');

class Processor {
  static async readExcel(buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    const rows = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const values = row.values.slice(1); // Remove first empty value
      if (values.length > 0) {
        rows.push(values);
      }
    });
    
    return rows;
  }

  static validateAndClean(rows) {
    const students = [];
    const headers = this.detectHeaders(rows[0]);
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const student = this.mapRow(row, headers);
      if (this.isValidStudent(student)) {
        students.push(student);
      }
    }
    
    return students;
  }

  static detectHeaders(firstRow) {
    const headers = {};
    const keywords = {
      seatNumber: ['seat', 'رقم الجلوس', 'جلوس'],
      name: ['name', 'الاسم', 'اسم الطالب'],
      school: ['school', 'المدرسة', 'اسم المدرسة'],
      governorate: ['governorate', 'المحافظة'],
      administration: ['administration', 'الإدارة'],
      division: ['division', 'الشعبة', 'القسم'],
      total: ['total', 'المجموع', 'الدرجة'],
      percentage: ['percentage', 'النسبة', 'النسبة المئوية'],
      status: ['status', 'الحالة', 'النجاح']
    };
    
    firstRow.forEach((cell, idx) => {
      const value = String(cell || '').toLowerCase();
      for (const [key, words] of Object.entries(keywords)) {
        if (words.some(w => value.includes(w))) {
          headers[key] = idx;
        }
      }
    });
    
    return headers;
  }

  static mapRow(row, headers) {
    return {
      seatNumber: String(row[headers.seatNumber] || '').trim(),
      name: String(row[headers.name] || '').trim(),
      school: String(row[headers.school] || '').trim(),
      governorate: String(row[headers.governorate] || '').trim(),
      administration: String(row[headers.administration] || '').trim(),
      division: String(row[headers.division] || '').trim(),
      total: Number(row[headers.total] || 0),
      percentage: Number(row[headers.percentage] || 0),
      status: String(row[headers.status] || 'ناجح').trim()
    };
  }

  static isValidStudent(student) {
    return student.seatNumber && student.name && student.total > 0;
  }

  static removeDuplicates(students) {
    const seen = new Set();
    return students.filter(s => {
      if (seen.has(s.seatNumber)) return false;
      seen.add(s.seatNumber);
      return true;
    });
  }

  static computeStatistics(students) {
    const governorates = {};
    const schools = {};
    let totalSum = 0;
    let passed = 0;
    
    students.forEach(s => {
      totalSum += s.total;
      if (s.status.includes('ناجح') || s.percentage >= 50) passed++;
      
      if (!governorates[s.governorate]) {
        governorates[s.governorate] = { count: 0, sum: 0 };
      }
      governorates[s.governorate].count++;
      governorates[s.governorate].sum += s.total;
      
      if (!schools[s.school]) {
        schools[s.school] = { count: 0, governorate: s.governorate };
      }
      schools[s.school].count++;
    });
    
    const govList = Object.entries(governorates).map(([name, data]) => ({
      name,
      count: data.count,
      avgPercentage: (data.sum / data.count / 410 * 100).toFixed(2)
    }));
    
    return {
      totalStudents: students.length,
      passed,
      failed: students.length - passed,
      avgPercentage: (totalSum / students.length / 410 * 100).toFixed(2),
      governorates: govList.length,
      schools: Object.keys(schools).length,
      governoratesList: govList
    };
  }

  static topStudents(students, limit = 50) {
    return [...students]
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, limit)
      .map((s, i) => ({ ...s, rank: i + 1 }));
  }
}

module.exports = Processor;
