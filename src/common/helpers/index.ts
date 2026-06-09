import * as ExcelJS from 'exceljs';
import * as parquet from 'parquetjs-lite';
import * as path from 'path';
import * as fs from 'fs';

export type ReportType = 'sensor' | 'camera' | 'cdr' | 'alerts' | 'device';

export const getTimestamp = (): string => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('_');
};

export const generateExcelFile = async (taskId: string | number, data: any[], type: ReportType): Promise<string> => {
  const outputDir = `/var/www/html/backend-mylcomiotpbx/public/excel/${taskId}`;
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const fileName = `${getTimestamp()}_${type}.xlsx`;
  const filePath = path.join(outputDir, fileName);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(
    type.charAt(0).toUpperCase() + type.slice(1) + 'Data'
  );

  switch (type) {
    case 'sensor':
      worksheet.columns = [
        { header: 'Sede', key: 'sede_name', width: 30 },
        { header: 'Sensor', key: 'sensor_name', width: 30 },
        { header: 'DevEUI', key: 'sensor_deveui', width: 25 },
        { header: 'Atributo', key: 'attribute_name', width: 30 },
        { header: 'Valor', key: 'value', width: 15 },
        { header: 'Timestamp', key: 'time', width: 25 },
      ];
      break;
    case 'camera':
      worksheet.columns = [
        { header: 'Sede', key: 'sede_name', width: 30 },
        { header: 'Cámara', key: 'camera_name', width: 30 },
        { header: 'Serial', key: 'camera_serial', width: 25 },
        { header: 'Evento', key: 'event_name', width: 25 },
        { header: 'Valor', key: 'value', width: 15 },
        { header: 'Timestamp', key: 'time', width: 25 },
      ];
      break;
    case 'cdr':
      worksheet.columns = [
        { header: 'Fecha Llamada', key: 'calldate', width: 25 },
        { header: 'Origen Nombre', key: 'src_name', width: 30 },
        { header: 'Origen Número', key: 'src', width: 20 },
        { header: 'Destino Nombre', key: 'dst_name', width: 30 },
        { header: 'Destino Número', key: 'dst', width: 20 },
        { header: 'Tipo de Llamada', key: 'lastapp', width: 20 },
        { header: 'Estado de Llamada', key: 'disposition', width: 20 },
        { header: 'Duración (s)', key: 'duration', width: 15 },
      ];
      break;
    case 'alerts':
      worksheet.columns = [
        { header: 'Tipo', key: 'type', width: 25 },
        { header: 'Nombre', key: 'device_name', width: 30 },
        { header: 'Atributo', key: 'attribute_name', width: 20 },
        { header: 'Evento', key: 'value', width: 30 },
        { header: 'Sede', key: 'sede_name', width: 20 },
        { header: 'Fecha', key: 'alerted_at', width: 20 },
      ];
      break;
    case 'device':
      worksheet.columns = [
        { header: 'Sede', key: 'sede_name', width: 25 },
        { header: 'Nombre', key: 'device_name', width: 30 },
        { header: 'Serial', key: 'device_serial', width: 20 },
        { header: 'Atributo', key: 'attribute', width: 30 },
        { header: 'Valor', key: 'value', width: 30 },
        { header: 'Fecha', key: 'time', width: 30 },
      ];
      break;
    default:
      throw new Error(`Tipo de reporte no soportado: ${type}`);
  }

  data.forEach((row) => worksheet.addRow({ ...row }));
  worksheet.getRow(1).font = { bold: true };

  await workbook.xlsx.writeFile(filePath);
  console.log(`Excel generado en: ${filePath}`);
  return filePath;
};

export const generateParquetFile = async (taskId: string | number, data: any[], type: ReportType): Promise<string> => {
  const outputDir = `/var/www/html/backend-mylcomiotpbx/public/parquet/${taskId}`;
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const fileName = `${getTimestamp()}_${type}.parquet`;
  const filePath = path.join(outputDir, fileName);

  let schemaDef: any;
  switch (type) {
    case 'sensor':
      schemaDef = {
        sede_name: { type: 'UTF8' },
        sensor_name: { type: 'UTF8' },
        sensor_deveui: { type: 'UTF8' },
        attribute_name: { type: 'UTF8' },
        value: { type: 'UTF8' },
        time: { type: 'UTF8' },
      };
      break;
    case 'camera':
      schemaDef = {
        sede_name: { type: 'UTF8' },
        camera_name: { type: 'UTF8' },
        camera_serial: { type: 'UTF8' },
        event_name: { type: 'UTF8' },
        value: { type: 'UTF8' },
        time: { type: 'UTF8' },
      };
      break;
    case 'cdr':
      schemaDef = {
        calldate: { type: 'UTF8' },
        src_name: { type: 'UTF8' },
        src: { type: 'UTF8' },
        dst_name: { type: 'UTF8' },
        dst: { type: 'UTF8' },
        lastapp: { type: 'UTF8' },
        disposition: { type: 'UTF8' },
        duration: { type: 'INT64' },
      };
      break;
    case 'alerts':
      schemaDef = {
        type: { type: 'UTF8' },
        device_name: { type: 'UTF8' },
        attribute_name: { type: 'UTF8' },
        value: { type: 'UTF8' },
        sede_name: { type: 'UTF8' },
        alerted_at: { type: 'UTF8' },
      };
      break;
    case 'device':
      schemaDef = {
        sede_name: { type: 'UTF8' },
        device_name: { type: 'UTF8' },
        device_serial: { type: 'UTF8' },
        attribute: { type: 'UTF8' },
        value: { type: 'UTF8' },
        time: { type: 'UTF8' },
      };
      break;
    default:
      throw new Error(`Tipo de reporte no soportado: ${type}`);
  }

  const schema = new parquet.ParquetSchema(schemaDef);
  const writer = await parquet.ParquetWriter.openFile(schema, filePath);
  
  for (const row of data) {
    await writer.appendRow(row);
  }
  await writer.close();

  console.log(`Parquet generado en: ${filePath}`);
  return filePath;
};