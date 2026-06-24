using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Subh_sankalp_estate.Migrations
{
    /// <inheritdoc />
    public partial class AddPLCAndEDCToReceipts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "EDC",
                table: "Receipts",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PLC",
                table: "Receipts",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "PasswordHash", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 15, 6, 49, 50, 476, DateTimeKind.Utc).AddTicks(4301), "$2a$11$v6sQoK9TdYkTfUpYnUQfjuj2Hd9iMrU.ZaXWmnE6RxPlm1fFaOUq.", new DateTime(2025, 11, 15, 6, 49, 50, 476, DateTimeKind.Utc).AddTicks(4304) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EDC",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "PLC",
                table: "Receipts");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "PasswordHash", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 10, 8, 44, 13, 764, DateTimeKind.Utc).AddTicks(6183), "$2a$11$BxVw5W4jYF5bUuI/EJ1.M.nh5Slsd8oNDbtnsbNS.LtiFINnK6gcG", new DateTime(2025, 11, 10, 8, 44, 13, 764, DateTimeKind.Utc).AddTicks(6189) });
        }
    }
}
