using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Subh_sankalp_estate.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentDateColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "PasswordHash", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 10, 8, 44, 13, 764, DateTimeKind.Utc).AddTicks(6183), "$2a$11$BxVw5W4jYF5bUuI/EJ1.M.nh5Slsd8oNDbtnsbNS.LtiFINnK6gcG", new DateTime(2025, 11, 10, 8, 44, 13, 764, DateTimeKind.Utc).AddTicks(6189) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "PasswordHash", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 8, 2, 15, 44, 554, DateTimeKind.Utc).AddTicks(6044), "$2a$11$g9SE.1McKN8v.KKrZ3nzquT266uBkZ70nYUDQb9ZP84McgkGhLt8i", new DateTime(2025, 11, 8, 2, 15, 44, 554, DateTimeKind.Utc).AddTicks(6050) });
        }
    }
}
